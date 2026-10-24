import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  private kafka: Kafka;
  private producer: Producer;
  private defaultPartitions: number = 1;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService
      .get<string>('RMU_KAFKA_BROKERS')!
      .split(',')
      .map(broker => broker.trim());
    const clientId = this.configService.get<string>('RMU_KAFKA_CLIENT_ID')!;
    // kafkajs defaults, made explicit: emit() retries 5 times before it rejects.
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: { retries: 5 },
    });
    this.logger.debug(`Created Kafka with brokers: ${JSON.stringify(brokers)} and clientId: ${clientId} `);
    this.defaultPartitions = this.configService.get<number>('RMU_KAFKA_DEFAULT_PARTITIONS', 1);
  }

  async onModuleInit() {
    this.logger.debug('Connecting Kafka producer...');
    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.debug('Kafka producer connected.');
  }

  async emit(topic: string, message: { data?: unknown }) {
    this.logger.debug(`Emitting message to topic ${topic}`);

    const id = (message.data as { id?: unknown } | undefined)?.id;
    await this.producer.send({
      topic,
      acks: -1,
      messages: [
        {
          value: JSON.stringify(message),
          partition: this.getPartition(typeof id === 'string' ? id : ''),
        },
      ],
    });
  }

  private getPartition(key: string): number {
    // Simple hash-based partitioning
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % this.defaultPartitions;
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';
import { Faction } from '../../domain/aggregates/faction.aggregate';
import { FactionEventBusPort } from '../../application/ports/faction-event-bus.port';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

@Injectable()
export class KafkaFactionEventBusAdapter implements FactionEventBusPort {
  private readonly logger = new Logger(KafkaFactionEventBusAdapter.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  publish(event: DomainEvent<Faction>): void {
    this.kafkaProducerService.emit(`internal.rmu-strategic.faction.${event.eventType}.v1`, event).catch(err => {
      this.logger.error('Error publishing event to Kafka', err);
    });
  }
}

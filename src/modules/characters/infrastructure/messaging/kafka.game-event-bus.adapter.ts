import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';
import { CharacterEventBusPort } from '../../application/ports/character-event-bus.port';
import { CharacterProps } from '../../domain/aggregates/character.aggregate';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

@Injectable()
export class KafkaCharacterEventBusAdapter implements CharacterEventBusPort {
  private readonly logger = new Logger(KafkaCharacterEventBusAdapter.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  publish(event: DomainEvent<CharacterProps>): void {
    this.kafkaProducerService.emit(`internal.rmu-strategic.character.${event.eventType}.v1`, event).catch((err) => {
      this.logger.error('Error publishing event to Kafka', err);
    });
  }
}

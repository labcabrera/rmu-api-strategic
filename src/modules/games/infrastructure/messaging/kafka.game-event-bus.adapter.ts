import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';
import { Game } from '../../domain/aggregates/game.aggregate';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { GameEventBusPort } from '../../application/ports/game-event-bus.port';

@Injectable()
export class KafkaGameEventBusAdapter implements GameEventBusPort {
  private readonly logger = new Logger(KafkaGameEventBusAdapter.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  publish(event: DomainEvent<Game>): void {
    this.kafkaProducerService.emit(`internal.rmu-strategic.game.${event.eventType}.v1`, event).catch(err => {
      this.logger.error('Error publishing event to Kafka', err);
    });
  }
}

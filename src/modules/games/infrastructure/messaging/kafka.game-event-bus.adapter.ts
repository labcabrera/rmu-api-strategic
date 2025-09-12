import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';
import { Game } from '../../domain/aggregates/game.aggregate';
import { GameCreatedEvent, GameUpdatedEvent, GameDeletedEvent } from '../../domain/events/game.events';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

@Injectable()
export class KafkaGameEventBusAdapter {
  private readonly logger = new Logger(KafkaGameEventBusAdapter.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  publish(event: DomainEvent<Game>): void {
    this.kafkaProducerService.emit(`internal.rmu-strategic.game.${event.eventType}.v1`, event).catch((err) => {
      this.logger.error('Error publishing event to Kafka', err);
    });
  }

  async created(entity: Game): Promise<void> {
    const event = new GameCreatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.game.created.v1', event);
  }
  async updated(entity: Game): Promise<void> {
    const event = new GameUpdatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.game.updated.v1', event);
  }

  async deleted(entity: Game): Promise<void> {
    const event = new GameDeletedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.game.deleted.v1', event);
  }
}

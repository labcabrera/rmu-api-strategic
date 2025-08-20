import { Injectable } from '@nestjs/common';

import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';
import { Game } from '../../domain/entities/game';
import { GameCreatedEvent, GameUpdatedEvent, GameDeletedEvent } from '../../domain/events/game.events';

@Injectable()
export class KafkaGameProducerService {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

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

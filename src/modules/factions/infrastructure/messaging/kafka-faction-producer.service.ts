import { Injectable } from '@nestjs/common';

import { KafkaProducerService } from 'src/modules/shared/infrastructure/messaging/kafka-producer.service';
import { Faction } from '../../domain/entities/faction.entity';
import { FactionCreatedEvent, FactionUpdatedEvent, FactionDeletedEvent } from '../../domain/events/faction.events';

@Injectable()
export class KafkaFactionProducerService {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async created(entity: Faction): Promise<void> {
    const event = new FactionCreatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.faction.created.v1', event);
  }
  async updated(entity: Faction): Promise<void> {
    const event = new FactionUpdatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.faction.updated.v1', event);
  }

  async deleted(entity: Faction): Promise<void> {
    const event = new FactionDeletedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.faction.deleted.v1', event);
  }
}

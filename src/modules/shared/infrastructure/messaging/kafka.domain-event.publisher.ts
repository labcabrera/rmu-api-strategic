import { Injectable, Logger } from '@nestjs/common';
import type { DomainEventPublisher } from '../../application/ports/domain-event-publisher.port.js';
import type { BaseAggregateRoot } from '../../domain/aggregates/base-aggregate.js';
import type { DomainEvent } from '../../domain/events/domain-event.js';
import { KafkaProducerService } from './kafka-producer.service.js';

/** The message is the DomainEvent itself, as the per-aggregate producers sent it (tactical consumes it). */
@Injectable()
export class KafkaDomainEventPublisher implements DomainEventPublisher {
  private readonly logger = new Logger(KafkaDomainEventPublisher.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async publish(aggregateType: string, ...events: DomainEvent<unknown>[]): Promise<void> {
    // One at a time, so consumers see the events in the order they happened.
    for (const event of events) {
      const topic = `internal.rmu-strategic.${aggregateType}.${event.eventType}.v1`;
      try {
        await this.kafkaProducerService.emit(topic, event);
      } catch (error) {
        const id = (event.data as { id?: string } | undefined)?.id;
        this.logger.error(`Lost ${topic} for ${aggregateType} ${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async publishChanges(aggregateType: string, aggregate: BaseAggregateRoot<{ id: string }>): Promise<void> {
    // A copy: getUncommittedEvents() returns the internal array, which uncommit() empties.
    const events = [...aggregate.getUncommittedEvents()];
    aggregate.uncommit();
    await this.publish(aggregateType, ...events);
  }
}

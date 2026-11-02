import type { BaseAggregateRoot } from '../../domain/aggregates/base-aggregate.js';
import type { DomainEvent } from '../../domain/events/domain-event.js';

export const DOMAIN_EVENT_PUBLISHER = Symbol('DomainEventPublisher');

/**
 * Publishes domain events to `internal.rmu-strategic.<aggregateType>.<eventType>.v1` (the topics of the former
 * per-aggregate producers, unchanged). Publishing happens after the change is saved, so a failure is logged and never
 * thrown: the caller's request still succeeds.
 */
export interface DomainEventPublisher {
  publish(aggregateType: string, ...events: DomainEvent<unknown>[]): Promise<void>;

  /** Publishes the aggregate's uncommitted events and clears them. */
  publishChanges(aggregateType: string, aggregate: BaseAggregateRoot<{ id: string }>): Promise<void>;
}

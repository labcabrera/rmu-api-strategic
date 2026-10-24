import type { DomainEventPublisher } from '../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { BaseAggregateRoot } from '../../../src/modules/shared/domain/aggregates/base-aggregate.js';
import type { DomainEvent } from '../../../src/modules/shared/domain/events/domain-event.js';

/** An in-memory DomainEventPublisher: `publish` is a spy, and publishChanges goes through it like the Kafka one. */
export function fakeEventPublisher() {
  const published: { aggregateType: string; event: DomainEvent<unknown> }[] = [];
  const publish = vi.fn((aggregateType: string, ...events: DomainEvent<unknown>[]) => {
    events.forEach(event => published.push({ aggregateType, event }));
    return Promise.resolve();
  });
  const publishChanges = vi.fn((aggregateType: string, aggregate: BaseAggregateRoot<{ id: string }>) => {
    const events = [...aggregate.getUncommittedEvents()];
    aggregate.uncommit();
    return publish(aggregateType, ...events);
  });
  const publisher: DomainEventPublisher = { publish, publishChanges };
  return { publisher, publish, publishChanges, published };
}

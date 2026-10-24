import { BaseAggregateRoot } from '../../../../src/modules/shared/domain/aggregates/base-aggregate.js';
import { DomainEvent } from '../../../../src/modules/shared/domain/events/domain-event.js';

type Props = { id: string; name: string; updatedAt?: Date };

class Sample extends BaseAggregateRoot<Props> {
  constructor(
    id: string,
    public name: string,
    public updatedAt?: Date,
  ) {
    super(id);
  }

  getProps(): Props {
    return { id: this.id, name: this.name, updatedAt: this.updatedAt };
  }
}

describe('BaseAggregateRoot', () => {
  it('has changes until it is stored, and then only when its props change (updatedAt does not count)', () => {
    const sample = new Sample('s-1', 'first');
    expect(sample.hasChanges()).toBe(true);
    sample.restoreVersion(3);
    expect(sample.version).toBe(3);
    expect(sample.hasChanges()).toBe(false);
    sample.updatedAt = new Date();
    expect(sample.hasChanges()).toBe(false);
    sample.name = 'second';
    expect(sample.hasChanges()).toBe(true);
    sample.restoreVersion(4);
    expect(sample.hasChanges()).toBe(false);
  });

  it('keeps the version out of JSON, so events carrying the aggregate do not change (F-receta-27)', () => {
    const sample = new Sample('s-1', 'first').restoreVersion(7);
    expect(JSON.parse(JSON.stringify(sample))).not.toHaveProperty('storedVersion');
    expect(JSON.stringify(sample)).not.toContain('7');
  });

  it('rejects a stale version with a 409 version-conflict', () => {
    const sample = new Sample('s-1', 'first').restoreVersion(2);
    expect(() => sample.checkVersion(undefined)).not.toThrow();
    expect(() => sample.checkVersion(2)).not.toThrow();
    expect(() => sample.checkVersion(1)).toThrow(expect.objectContaining({ statusCode: 409, code: 'version-conflict' }));
  });
});

describe('DomainEvent', () => {
  const previous = process.env.RMU_KAFKA_CLIENT_ID;

  afterEach(() => {
    if (previous === undefined) delete process.env.RMU_KAFKA_CLIENT_ID;
    else process.env.RMU_KAFKA_CLIENT_ID = previous;
  });

  it('names this API as the producer, from RMU_KAFKA_CLIENT_ID (F-strategic-13)', () => {
    process.env.RMU_KAFKA_CLIENT_ID = 'rmu-api-strategic-test';
    expect(new DomainEvent('updated', {}).producer).toBe('rmu-api-strategic-test');
    delete process.env.RMU_KAFKA_CLIENT_ID;
    expect(new DomainEvent('updated', {}).producer).toBe('rmu-api-strategic');
  });
});

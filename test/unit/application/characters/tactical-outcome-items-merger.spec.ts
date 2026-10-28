import { TacticalOutcomeItemsMerger } from '../../../../src/modules/characters/application/services/tactical-outcome-items.merger.js';
import type { TacticalItemOutcome } from '../../../../src/modules/characters/domain/value-objects/tactical-game-outcome.vo.js';
import type { ItemRepository } from '../../../../src/modules/items/application/ports/item-repository.port.js';
import { Item } from '../../../../src/modules/items/domain/aggregates/item.js';
import type { ItemCoating } from '../../../../src/modules/items/domain/value-objects/item-coating.vo.js';
import { fakeEventPublisher } from '../../support/fake-event-publisher.js';

const SPENT_AT = '2026-10-27T10:00:00.000Z';
const NEW_AT = '2026-10-27T12:00:00.000Z';

const coating = (appliedAt: string): ItemCoating => ({
  name: 'Invented venom',
  poison: { form: 'liquid' } as ItemCoating['poison'],
  appliedAt,
});

const sword = (appliedAt: string | null): Item =>
  Item.fromProps({
    id: 'sword',
    gameId: 'game-001',
    factionId: null,
    characterId: 'patient',
    itemTypeId: 'broadsword',
    name: 'Broadsword',
    category: 'weapon',
    carried: true,
    weapon: {} as never,
    armor: null,
    shield: null,
    modifiers: [],
    amount: null,
    info: { length: 1, weight: 1, strength: 80, stackable: false },
    description: null,
    createdAt: new Date(),
    updatedAt: null,
    accessType: 'public',
    owner: 'master',
    coating: appliedAt ? coating(appliedAt) : null,
  });

const setup = (item: Item) => {
  const update = vi.fn((each: Item) => Promise.resolve(each));
  const repository = { findByCharacterId: vi.fn(() => Promise.resolve([item])), update } as unknown as ItemRepository;
  const events = fakeEventPublisher();
  return { merger: new TacticalOutcomeItemsMerger(repository, events.publisher), update, events };
};

const outcome = (coatingSpent: TacticalItemOutcome['coatingSpent']): TacticalItemOutcome[] => [
  { itemId: 'sword', modifiers: [], coatingSpent },
];

/** Spec 044, decision 3: the outcome names the spent coating by its appliedAt. */
describe('TacticalOutcomeItemsMerger, spent coating', () => {
  it('removes the coating whose appliedAt the game spent', async () => {
    const item = sword(SPENT_AT);
    const { merger, update, events } = setup(item);

    const { summary } = await merger.merge('patient', outcome({ appliedAt: SPENT_AT }));

    expect(item.coating).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
    expect(events.published.map(p => p.event.eventType)).toEqual(['updated']);
    expect(summary?.coatingsSpent).toEqual(['sword']);
  });

  it('keeps a new coating applied during the game', async () => {
    const item = sword(NEW_AT);
    const { merger, update, events } = setup(item);

    const { summary } = await merger.merge('patient', outcome({ appliedAt: SPENT_AT }));

    expect(item.coating).toMatchObject({ appliedAt: NEW_AT });
    expect(update).not.toHaveBeenCalled();
    expect(events.published).toEqual([]);
    expect(summary?.coatingsSpent).toBeUndefined();
  });

  it('removes any coating for a legacy outcome with coatingSpent true', async () => {
    const item = sword(NEW_AT);
    const { merger } = setup(item);

    const { summary } = await merger.merge('patient', outcome(true));

    expect(item.coating).toBeNull();
    expect(summary?.coatingsSpent).toEqual(['sword']);
  });

  it('does nothing on a retry, when the coating is already gone', async () => {
    const item = sword(null);
    const { merger, update } = setup(item);

    const { summary } = await merger.merge('patient', outcome({ appliedAt: SPENT_AT }));

    expect(update).not.toHaveBeenCalled();
    expect(summary?.coatingsSpent).toBeUndefined();
  });
});

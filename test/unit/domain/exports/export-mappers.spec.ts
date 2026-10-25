import { Item } from '../../../../src/modules/items/domain/aggregates/item.js';
import type { ItemProps } from '../../../../src/modules/items/domain/aggregates/item-props.js';
import type { Injury } from '../../../../src/modules/characters/domain/value-objects/injury.vo.js';
import {
  assignRefs,
  characterEntry,
  collectReferences,
  exportFileName,
  itemToExport,
} from '../../../../src/modules/exports/domain/mappers/export.mappers.js';
import { buildCharacter, skill, trait } from '../characters/traits/character.fixture.js';

const item = (props: Partial<ItemProps> & { id: string }): Item =>
  Item.fromProps({
    gameId: 'game-001',
    factionId: null,
    characterId: 'character-001',
    itemTypeId: 'sword',
    name: 'Sword',
    category: 'weapon',
    carried: true,
    weapon: null,
    armor: null,
    shield: null,
    modifiers: [],
    amount: null,
    info: { length: 1, weight: 3, strength: 20, stackable: false },
    description: null,
    createdAt: new Date(),
    updatedAt: null,
    accessType: 'public',
    owner: 'user-001',
    ...props,
  });

const injury: Injury = {
  id: 'injury-1',
  type: 'bone',
  severity: 'medium',
  penalty: -15,
  initialPenalty: -20,
  source: { kind: 'manual' },
  treatments: [],
  recovery: {
    roll: 50,
    modifiers: 0,
    total: 50,
    baseDays: 10,
    multiplier: 1,
    totalDays: 10,
    remainingDays: 7,
    startedAt: '2026-10-01T00:00:00.000Z',
  },
  status: 'recovering',
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('export mappers (spec 024)', () => {
  const sword = item({
    id: 'sword-1',
    modifiers: [
      { id: 'm1', type: 'quality', value: 5, appliesTo: 'attack', source: { kind: 'crafting', ledgerEntryId: 'l1' }, createdAt: 'x' },
      { id: 'm2', type: 'breakage', value: -10, appliesTo: 'all', source: { kind: 'repair', ledgerEntryId: 'l2' }, createdAt: 'x' },
      { id: 'm3', type: 'breakage', value: -5, appliesTo: 'all', temporary: true, createdAt: 'x' },
    ],
  });
  const gold = item({
    id: 'gold-1',
    itemTypeId: 'gold-coin',
    name: 'Gold',
    category: 'currency',
    amount: 12.5,
    info: { length: null, weight: 0.01, strength: null, stackable: true },
  });

  it('exports the own data and temporary state of a character, with slots as refs and no ids or derived values', () => {
    const character = buildCharacter({
      skills: [skill('body-development', null, 4)],
      traits: [trait('ambidextrous', 1), trait('night-vision', undefined, undefined, 'race')],
      slots: { mainHand: 'sword-1', offHand: null },
    });
    character.statistics.st.temporary = 40;
    character.hp = { max: 30, current: 12 };
    character.endurance = { base: 10, racialBonus: 5, customBonus: 0, max: 20, current: 4, accumulator: 2, fatiguePenalty: -5 };
    character.injuries = [injury];
    character.appliedTacticalGames = ['tactical-1'];
    const refs = assignRefs(['character-001'], ['sword-1', 'gold-1']);
    const entry = characterEntry(character, [sword, gold], refs, () => undefined);

    expect(entry.ref).toBe('c1');
    expect(entry.character).toMatchObject({
      name: 'Test',
      info: { raceId: 'race-001', raceName: 'Race', cultureId: null },
      hp: { current: 12 },
      endurance: { current: 4, accumulator: 2, fatiguePenalty: -5 },
      equipment: { slots: { mainHand: 'i1', offHand: null } },
      injuries: [injury],
    });
    expect(entry.character.statistics.st).toEqual({ potential: 50, temporary: 40 });
    expect(entry.character.traits.map(t => t.traitId)).toEqual(['ambidextrous']);
    for (const key of [
      'id',
      'gameId',
      'faction',
      'owner',
      'version',
      'createdAt',
      'appliedTacticalGames',
      'movement',
      'defense',
      'attacks',
    ]) {
      expect(entry.character).not.toHaveProperty(key);
    }
    expect(entry.items.map(i => i.ref)).toEqual(['i1', 'i2']);
    expect(entry.items[1]).toMatchObject({ itemTypeId: 'gold-coin', amount: 12.5 });
  });

  it('points a crafter in the file to its ref, keeps only the name of one outside it and drops temporary modifiers', () => {
    const refs = assignRefs(['smith-1'], ['sword-1']);
    const crafters: Record<string, { id: string | null; name: string | null }> = {
      l1: { id: 'smith-1', name: 'Smith' },
      l2: { id: 'stranger-1', name: 'Stranger' },
    };
    const exported = itemToExport(sword, refs, source => crafters[source.ledgerEntryId!]);
    expect(exported.modifiers).toEqual([
      { id: 'm1', type: 'quality', value: 5, appliesTo: 'attack', source: { kind: 'crafting', crafterRef: 'c1' }, createdAt: 'x' },
      { id: 'm2', type: 'breakage', value: -10, appliesTo: 'all', source: { kind: 'repair', crafterName: 'Stranger' }, createdAt: 'x' },
    ]);
  });

  it('fills the fields that items stored before specs 019 and 023 lack', () => {
    const old = item({ id: 'old-1', modifiers: undefined, catalog: undefined, value: undefined, unrepairable: undefined });
    const exported = itemToExport(old, assignRefs([], ['old-1']), () => undefined);
    expect(exported).toMatchObject({ ref: 'i1', modifiers: [], catalog: null, value: null, acquiredPrice: null, unrepairable: false });
  });

  it('lists the references the file uses, with the names the source knew', () => {
    const character = buildCharacter({ skills: [skill('perception')], traits: [trait('ambidextrous', 1)] });
    const entry = characterEntry(character, [sword], assignRefs(['character-001'], ['sword-1']), () => undefined);
    expect(collectReferences([entry])).toEqual({
      races: [{ id: 'race-001', name: 'Race' }],
      professions: [{ id: 'fighter', name: null }],
      cultures: [],
      skills: [{ id: 'perception', name: null }],
      traits: [{ id: 'ambidextrous', name: 'ambidextrous' }],
      itemTypes: [{ id: 'sword', name: 'Sword' }],
    });
  });

  it('names the file after the kind, a slug of the name and the day', () => {
    expect(exportFileName('character', 'Éowyn of Rohan!', new Date('2026-10-25T10:00:00Z'))).toBe(
      'character-eowyn-of-rohan-20261025.rmu.json',
    );
    expect(exportFileName('faction', '***', new Date('2026-01-02T00:00:00Z'))).toBe('faction-faction-20260102.rmu.json');
  });
});

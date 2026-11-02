import { Faction } from '../../../../src/modules/factions/domain/aggregates/faction.js';
import { FactionManagement } from '../../../../src/modules/factions/domain/value-objects/faction-management.vo.js';
import type { FactionNpc } from '../../../../src/modules/factions/domain/value-objects/faction-npc.vo.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';

const npc = (overrides: Partial<FactionNpc> = {}): FactionNpc => ({
  id: 'entry-1',
  npcId: 'wolf',
  name: 'Wolves',
  count: 2,
  notes: null,
  ...overrides,
});

const faction = (npcs?: FactionNpc[]) =>
  Faction.create({
    gameId: 'game-1',
    name: 'Riders',
    management: new FactionManagement(0),
    shortDescription: undefined,
    description: undefined,
    imageUrl: undefined,
    owner: 'owner-1',
    npcs,
  });

describe('Faction NPCs (workspace spec 055)', () => {
  it('starts without NPCs, and with the ones it is created with', () => {
    expect(faction().npcs).toEqual([]);
    expect(faction([npc()]).getProps().npcs).toEqual([npc()]);
  });

  it('reads a stored faction without NPCs as an empty list', () => {
    const props = { ...faction().getProps(), npcs: undefined as unknown as FactionNpc[] };
    expect(Faction.fromProps(props).npcs).toEqual([]);
  });

  it('replaces the whole list on update, carries it in the event and leaves it alone when not sent', () => {
    const riders = faction([npc()]);
    riders.uncommit();

    riders.update({ npcs: [npc({ id: 'entry-2', npcId: 'bear', name: 'Bear', count: 1, notes: 'Tamed' })] });
    expect(riders.npcs).toEqual([{ id: 'entry-2', npcId: 'bear', name: 'Bear', count: 1, notes: 'Tamed' }]);
    expect(riders.getUncommittedEvents()[0]).toMatchObject({ eventType: 'updated', data: { npcs: riders.npcs } });

    riders.update({ name: 'Raiders' });
    expect(riders.npcs).toHaveLength(1);

    riders.update({ npcs: [] });
    expect(riders.npcs).toEqual([]);
  });

  it.each([
    ['no specimen', [npc({ count: 0 })]],
    ['more than 50 specimens', [npc({ count: 51 })]],
    ['a fractional count', [npc({ count: 1.5 })]],
    ['an empty name', [npc({ name: ' ' })]],
    ['a repeated entry', [npc(), npc({ npcId: 'bear' })]],
    ['more than 100 entries', Array.from({ length: 101 }, (_, i) => npc({ id: `entry-${i}` }))],
  ])('rejects %s', (_, npcs) => {
    expect(() => faction().update({ npcs })).toThrow(ValidationError);
    expect(() => faction(npcs)).toThrow(ValidationError);
  });

  it('keeps a copy: changing the list it was given does not change the faction', () => {
    const list = [npc()];
    const riders = faction(list);
    list[0].count = 40;
    expect(riders.npcs[0].count).toBe(2);
  });
});

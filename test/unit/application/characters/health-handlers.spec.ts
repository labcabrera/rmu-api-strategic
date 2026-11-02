import { fakeEventPublisher } from '../../support/fake-event-publisher.js';
import { ApplyTacticalOutcomeCommand } from '../../../../src/modules/characters/application/cqrs/commands/apply-tactical-outcome.command.js';
import { RestCharacterCommand } from '../../../../src/modules/characters/application/cqrs/commands/rest-character.command.js';
import { RollInjuryRecoveryCommand } from '../../../../src/modules/characters/application/cqrs/commands/roll-injury-recovery.command.js';
import { RollPermanentInjuryCommand } from '../../../../src/modules/characters/application/cqrs/commands/roll-permanent-injury.command.js';
import { TreatInjuryCommand } from '../../../../src/modules/characters/application/cqrs/commands/treat-injury.command.js';
import { ApplyTacticalOutcomeHandler } from '../../../../src/modules/characters/application/cqrs/handlers/apply-tactical-outcome.handler.js';
import { RestCharacterHandler } from '../../../../src/modules/characters/application/cqrs/handlers/rest-character.handler.js';
import { CharacterRestService } from '../../../../src/modules/characters/application/services/character-rest.service.js';
import { RollInjuryRecoveryHandler } from '../../../../src/modules/characters/application/cqrs/handlers/roll-injury-recovery.handler.js';
import { RollPermanentInjuryHandler } from '../../../../src/modules/characters/application/cqrs/handlers/roll-permanent-injury.handler.js';
import { TreatInjuryHandler } from '../../../../src/modules/characters/application/cqrs/handlers/treat-injury.handler.js';
import type { CharacterRepository } from '../../../../src/modules/characters/application/ports/character-repository.port.js';
import type { HealingLogRepository } from '../../../../src/modules/characters/application/ports/healing-log-repository.port.js';
import type { HealingTablesClientPort } from '../../../../src/modules/characters/application/ports/healing-tables-client.port.js';
import type {
  AbsoluteManeuverResponse,
  ManeuverClientPort,
} from '../../../../src/modules/characters/application/ports/maneuver-client.port.js';
import { CharacterHealthStore } from '../../../../src/modules/characters/application/services/character-health.store.js';
import { Character } from '../../../../src/modules/characters/domain/aggregates/character.js';
import { CharacterSkill } from '../../../../src/modules/characters/domain/value-objects/character-skill.vo.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import { buildCharacter, skill, trait } from '../../domain/characters/traits/character.fixture.js';
import { TacticalOutcomeItemsMerger } from '../../../../src/modules/characters/application/services/tactical-outcome-items.merger.js';
import { CharacterProcessorService } from '../../../../src/modules/characters/domain/services/character-processor.service.js';
import type { ItemRepository } from '../../../../src/modules/items/application/ports/item-repository.port.js';
import { Item } from '../../../../src/modules/items/domain/aggregates/item.js';
import type { ItemModifier } from '../../../../src/modules/items/domain/value-objects/item-modifier.vo.js';
import { injury, SPEC_068_TABLES, TABLES, treatment } from '../../domain/characters/healing/healing.fixture.js';
import { TacticalOutcomeConsumption } from '../../../../src/modules/characters/application/services/tactical-outcome-consumption.service.js';
import type { ItemLedgerRepository } from '../../../../src/modules/items/application/ports/item-ledger-repository.port.js';
import { ItemLedger } from '../../../../src/modules/items/application/services/item-ledger.service.js';
import { ItemStock } from '../../../../src/modules/items/application/services/item-stock.service.js';
import type { ItemLedgerEntry } from '../../../../src/modules/items/domain/aggregates/item-ledger-entry.js';
import type { HealingTables } from '../../../../src/modules/characters/domain/value-objects/healing-tables.vo.js';
import { GetTreatmentDifficultyHandler } from '../../../../src/modules/characters/application/cqrs/handlers/get-treatment-difficulty.handler.js';
import { GetTreatmentDifficultyQuery } from '../../../../src/modules/characters/application/cqrs/queries/get-treatment-difficulty.query.js';
import type { CharacterAccess } from '../../../../src/modules/characters/application/services/character-access.service.js';

/** Invented difficulties: the rulebook ones live only in the gitignored data directory. */
const DIFFICULTY_TABLES: HealingTables = {
  ...TABLES,
  treatmentDifficulties: [
    { procedure: 'splint', injuryType: 'bone', severity: 'light', difficulty: 'e' },
    { procedure: 'surgery', injuryType: 'bone', severity: 'severe', difficulty: 'sf' },
  ],
  treatmentRules: {
    headDifficultySteps: 1,
    cauterizePenaltyPerBleeding: -5,
    bleedingProcedures: ['pressure', 'stitches', 'tourniquet', 'cauterize'],
    tourniquetLocations: ['arm', 'leg'],
  },
};

const MASTER = 'master-001';

const ranked = (skillId: string, ranks: number, totalBonus: number): CharacterSkill => {
  const result = skill(skillId, null, ranks);
  result.totalBonus = totalBonus;
  return result;
};

const character = (id: string, props: { gameId?: string; skills?: CharacterSkill[]; owner?: string } = {}): Character => {
  const result = buildCharacter({ skills: props.skills ?? [ranked('body-development', 4, 30)] });
  const props_ = result.getProps();
  const rebuilt = Character.fromProps({ ...props_, id, gameId: props.gameId ?? 'game-001', owner: props.owner ?? 'player-001' });
  rebuilt.hp.max = 30;
  rebuilt.hp.current = 30;
  rebuilt.statistics.co.totalBonus = 6;
  return rebuilt;
};

const setup = (characters: Character[], results: AbsoluteManeuverResponse['result'][] = [], healingTables: HealingTables = TABLES) => {
  const byId = new Map(characters.map(c => [c.id, c]));
  const update = vi.fn((c: Character) => Promise.resolve(c));
  const characterRepository = {
    findById: vi.fn((id: string) => Promise.resolve(byId.get(id) ?? null)),
    update,
  } as unknown as CharacterRepository;
  const gameRepository = {
    findById: vi.fn(() => Promise.resolve({ id: 'game-001', owner: MASTER } as Game)),
  } as unknown as GameRepository;
  const saveAll = vi.fn(() => Promise.resolve());
  const healingLogRepository = { saveAll } as unknown as HealingLogRepository;
  const { publisher, publish } = fakeEventPublisher();
  const store = new CharacterHealthStore(characterRepository, gameRepository, healingLogRepository, publisher);
  const tables: HealingTablesClientPort = { getHealingTables: () => Promise.resolve(healingTables) };
  const queue = [...results];
  const rolls: number[] = [];
  const absolute = vi.fn((roll: number) => {
    rolls.push(roll);
    const result = queue.shift() ?? 'success';
    const effects =
      result === 'absolute-failure'
        ? [{ status: 'injuryPenalty', value: 10 }]
        : result === 'partial-success'
          ? [{ status: 'recoveryRollModifier', value: -25 }]
          : [];
    return Promise.resolve({ result, message: result, effects });
  });
  const maneuvers: ManeuverClientPort = { absolute, percent: vi.fn() };
  return { store, tables, maneuvers, rolls, update, saveAll, publish, absolute };
};

const buildItem = (id: string, characterId: string, modifiers: ItemModifier[] = []): Item =>
  Item.fromProps({
    id,
    gameId: 'game-001',
    factionId: null,
    characterId,
    itemTypeId: 'broadsword',
    name: 'Broadsword',
    category: 'weapon',
    carried: true,
    weapon: null,
    armor: null,
    shield: null,
    modifiers,
    amount: null,
    info: { length: 1, weight: 1, strength: 80, stackable: false },
    description: null,
    createdAt: new Date(),
    updatedAt: null,
    accessType: 'public',
    owner: MASTER,
  });

const breakage = (id: string, value: number, extra: Partial<ItemModifier> = {}): ItemModifier => ({
  id,
  type: 'breakage',
  value,
  appliesTo: 'all',
  source: { kind: 'tactical', tacticalGameId: 'tactical-001' },
  createdAt: '2026-10-24T10:00:00.000Z',
  ...extra,
});

/** The outcome handler with its items: the repository keeps them by id and the processor is a spy. */
const outcomeHandler = (store: CharacterHealthStore, items: Item[] = []) => {
  const itemUpdate = vi.fn((item: Item) => Promise.resolve(item));
  const itemRepository = {
    findByCharacterId: vi.fn((characterId: string) => Promise.resolve(items.filter(item => item.characterId === characterId))),
    findById: vi.fn((id: string) => Promise.resolve(items.find(item => item.id === id) ?? null)),
    deleteById: vi.fn((id: string) => {
      items.splice(
        items.findIndex(item => item.id === id),
        1,
      );
      return Promise.resolve();
    }),
    update: itemUpdate,
  } as unknown as ItemRepository;
  const { publisher, publish: itemPublish } = fakeEventPublisher();
  const merger = new TacticalOutcomeItemsMerger(itemRepository, publisher);
  const process = vi.fn();
  const processor = { process } as unknown as CharacterProcessorService;
  // Workspace spec 068: the units spent in the game, with an in-memory ledger
  const ledgerEntries = new Map<string, ItemLedgerEntry>();
  const ledgerRepository = {
    findById: vi.fn((id: string) => Promise.resolve(ledgerEntries.get(id) ?? null)),
    save: vi.fn((entry: ItemLedgerEntry) => {
      ledgerEntries.set(entry.id, entry);
      return Promise.resolve(entry);
    }),
  } as unknown as ItemLedgerRepository;
  const consumption = new TacticalOutcomeConsumption(
    itemRepository,
    ledgerRepository,
    new ItemStock(itemRepository, publisher),
    new ItemLedger(ledgerRepository),
  );
  return {
    handler: new ApplyTacticalOutcomeHandler(store, merger, processor, consumption),
    itemUpdate,
    itemPublish,
    process,
    ledgerEntries,
  };
};

const stack = (id: string, characterId: string, amount: number): Item => {
  const item = buildItem(id, characterId);
  return Item.fromProps({ ...item.getProps(), category: 'herb', amount, info: { ...item.info, stackable: true } });
};

const treat = (props: Partial<ConstructorParameters<typeof TreatInjuryCommand>[number]> & Record<string, unknown> = {}) =>
  new TreatInjuryCommand(
    'patient',
    'i-1',
    (props.procedure as never) ?? 'splint',
    props.healerCharacterId as string | undefined,
    props.healer as never,
    'roll' in props ? (props.roll as number | undefined) : 70,
    props.difficulty as number | undefined,
    props.herbalism as never,
    props.healingType as never,
    MASTER,
    ['rmu-user'],
    undefined,
    props.castSupport as never,
    props.salveModifier as number | undefined,
  );

describe('Health handlers', () => {
  describe('ApplyTacticalOutcomeHandler', () => {
    const outcome = {
      tacticalGameId: 'tactical-001',
      actorId: 'actor-001',
      characterId: 'patient',
      name: 'Patient',
      hp: { start: 30, end: 10, delta: -20 },
      injuries: [injury({ id: 'i-new' })],
      injuriesAdded: ['i-new'],
      injuriesUpdated: [],
      injuriesHealed: [],
      conditions: [],
    };

    it('lets the service account apply the outcome once, storing log and event', async () => {
      const patient = character('patient');
      const { store, saveAll, publish, update } = setup([patient]);
      const { handler } = outcomeHandler(store);
      const service = ['rmu-service'];
      const result = await handler.execute(new ApplyTacticalOutcomeCommand('patient', outcome, 'sa', service));
      expect(result.hp.current).toBe(10);
      expect(result.injuries.map(i => i.id)).toEqual(['i-new']);
      expect(saveAll).toHaveBeenCalledWith('patient', 'game-001', [expect.objectContaining({ kind: 'tactical-outcome' })]);
      expect(publish).toHaveBeenCalledTimes(1);

      await handler.execute(new ApplyTacticalOutcomeCommand('patient', outcome, 'sa', service));
      expect(update).toHaveBeenCalledTimes(1);
      expect(patient.hp.current).toBe(10);
    });

    it('allows the game owner and rejects other users, including the character owner', async () => {
      const { store } = setup([character('patient')]);
      const { handler } = outcomeHandler(store);
      await expect(handler.execute(new ApplyTacticalOutcomeCommand('patient', outcome, 'player-001', ['rmu-user']))).rejects.toMatchObject({
        code: 'err-character-health-forbidden',
      });
      await expect(handler.execute(new ApplyTacticalOutcomeCommand('patient', outcome, MASTER, ['rmu-user']))).resolves.toBeDefined();
    });

    it('adds the breakage of the game to the items of the character, once, and processes the character', async () => {
      const patient = character('patient');
      const sword = buildItem('item-001', 'patient');
      const shield = buildItem('item-002', 'patient');
      const { store, saveAll } = setup([patient]);
      const { handler, itemUpdate, itemPublish, process } = outcomeHandler(store, [sword, shield, buildItem('item-009', 'other')]);
      const withItems = {
        ...outcome,
        items: [
          { itemId: 'item-001', modifiers: [breakage('m-1', -20)] },
          { itemId: 'item-002', modifiers: [breakage('m-2', 0, { broken: true })] },
          { itemId: 'item-009', modifiers: [breakage('m-9', -10)] },
        ],
      };
      await handler.execute(new ApplyTacticalOutcomeCommand('patient', withItems, 'sa', ['rmu-service']));
      expect(sword.getCondition()).toEqual({ breakagePenalty: -20, broken: false });
      expect(shield.getCondition().broken).toBe(true);
      expect(itemUpdate).toHaveBeenCalledTimes(2);
      expect(itemPublish).toHaveBeenCalledTimes(2);
      expect(process).toHaveBeenCalledWith(patient, [sword, shield]);
      expect(saveAll).toHaveBeenCalledWith('patient', 'game-001', [
        expect.objectContaining({
          summary: expect.objectContaining({
            itemsDamaged: ['item-001'],
            itemsBroken: ['item-002'],
            itemsIgnored: ['item-009'],
          }) as unknown,
        }),
      ]);

      await handler.execute(new ApplyTacticalOutcomeCommand('patient', withItems, 'sa', ['rmu-service']));
      expect(itemUpdate).toHaveBeenCalledTimes(2);
      expect(sword.modifiers).toHaveLength(1);
    });

    it('a retry after a failure adds no modifier twice', async () => {
      const patient = character('patient');
      const sword = buildItem('item-001', 'patient', [breakage('m-1', -20)]);
      const { store } = setup([patient]);
      const { handler, itemUpdate, process } = outcomeHandler(store, [sword]);
      const withItems = { ...outcome, items: [{ itemId: 'item-001', modifiers: [breakage('m-1', -20)] }] };
      await handler.execute(new ApplyTacticalOutcomeCommand('patient', withItems, 'sa', ['rmu-service']));
      expect(itemUpdate).not.toHaveBeenCalled();
      expect(sword.modifiers).toHaveLength(1);
      expect(process).toHaveBeenCalledTimes(1);
      expect(patient.isTacticalGameApplied('tactical-001')).toBe(true);
    });

    it('does not process the character for an outcome without item changes', async () => {
      const { store } = setup([character('patient')]);
      const { handler, process } = outcomeHandler(store, [buildItem('item-001', 'patient')]);
      await handler.execute(
        new ApplyTacticalOutcomeCommand('patient', { ...outcome, items: [{ itemId: 'item-001', modifiers: [] }] }, 'sa', ['rmu-service']),
      );
      expect(process).not.toHaveBeenCalled();
    });

    it('spends the units consumed in the game once, with a consumed ledger entry (spec 068)', async () => {
      const patient = character('patient');
      const items = [stack('herb-001', 'patient', 3), stack('potion-001', 'patient', 1), stack('herb-009', 'other', 2)];
      const { store, saveAll } = setup([patient]);
      const { handler, ledgerEntries, process } = outcomeHandler(store, items);
      const withConsumed = {
        ...outcome,
        itemsConsumed: [
          { itemId: 'herb-001', amount: 1 },
          { itemId: 'herb-001', amount: 1 },
          { itemId: 'potion-001', amount: 1 },
          { itemId: 'herb-009', amount: 1 },
        ],
      };
      await handler.execute(new ApplyTacticalOutcomeCommand('patient', withConsumed, 'sa', ['rmu-service']));
      expect(items.find(item => item.id === 'herb-001')?.amount).toBe(1);
      expect(items.find(item => item.id === 'potion-001')).toBeUndefined();
      expect(items.find(item => item.id === 'herb-009')?.amount).toBe(2);
      expect([...ledgerEntries.values()].map(entry => entry.getProps())).toEqual([
        expect.objectContaining({
          id: 'consumed:tactical-001:herb-001',
          kind: 'consumed',
          amount: 2,
          from: { kind: 'character', id: 'patient' },
        }),
        expect.objectContaining({ id: 'consumed:tactical-001:potion-001', kind: 'consumed', amount: 1 }),
      ]);
      expect(process).toHaveBeenCalledWith(patient, [items[0]]);
      expect(saveAll).toHaveBeenCalledWith('patient', 'game-001', [
        expect.objectContaining({
          summary: expect.objectContaining({
            itemsConsumed: [
              { itemId: 'herb-001', amount: 2, removed: false },
              { itemId: 'potion-001', amount: 1, removed: true },
            ],
            itemsConsumedIgnored: ['herb-009'],
          }) as unknown,
        }),
      ]);
      // A retry after the character failed to be stored spends nothing again
      patient.appliedTacticalGames = [];
      await handler.execute(new ApplyTacticalOutcomeCommand('patient', withConsumed, 'sa', ['rmu-service']));
      expect(items.find(item => item.id === 'herb-001')?.amount).toBe(1);
      expect(ledgerEntries.size).toBe(2);
    });

    it('adds the temporary modifiers of the game once, expiring from the day of the campaign (spec 068)', async () => {
      const patient = character('patient');
      patient.temporaryModifiers = [
        { id: 'tm-1', kind: 'morale', value: -10, source: 'manual', days: null, createdAt: '', tacticalGameId: null, expiresGameDay: null },
      ];
      const { store } = setup([patient]);
      const { handler } = outcomeHandler(store);
      const modifier = (id: string, days: number | null) => ({
        id,
        kind: 'morale' as const,
        value: 5,
        source: 'morale-absolute-success' as const,
        days,
        createdAt: '2026-11-02T00:00:00.000Z',
        tacticalGameId: 'tactical-001',
      });
      const result = await handler.execute(
        new ApplyTacticalOutcomeCommand(
          'patient',
          { ...outcome, temporaryModifiers: [modifier('tm-1', 3), modifier('tm-2', 30), modifier('tm-3', null)] },
          'sa',
          ['rmu-service'],
        ),
      );
      // The fake game has no calendar: day 1
      expect(result.temporaryModifiers).toEqual([
        expect.objectContaining({ id: 'tm-1', value: -10, expiresGameDay: null }),
        expect.objectContaining({ id: 'tm-2', value: 5, expiresGameDay: 31, tacticalGameId: 'tactical-001' }),
        expect.objectContaining({ id: 'tm-3', expiresGameDay: null }),
      ]);
    });

    it('rejects an outcome of another character', async () => {
      const { store } = setup([character('patient')]);
      const { handler } = outcomeHandler(store);
      await expect(
        handler.execute(new ApplyTacticalOutcomeCommand('patient', { ...outcome, characterId: 'other' }, 'sa', ['rmu-service'])),
      ).rejects.toMatchObject({ code: 'err-outcome-character-mismatch' });
    });
  });

  describe('TreatInjuryHandler', () => {
    const withInjury = () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', penalty: -10, initialPenalty: -10 })];
      return patient;
    };

    it('uses the Medicine bonus of a healer of the same game', async () => {
      const healer = character('healer', { skills: [ranked('medicine', 5, 35), ranked('herbalism', 2, 12)] });
      const { store, tables, maneuvers, rolls } = setup([withInjury(), healer], ['absolute-success']);
      const result = await new TreatInjuryHandler(store, tables, maneuvers, {} as never).execute(
        treat({ healerCharacterId: 'healer', difficulty: -10 }),
      );
      expect(rolls).toEqual([70 + 35 - 10]);
      expect(result.injuries[0].treatments[0]).toMatchObject({
        healer: { characterId: 'healer', bonus: 35 },
        total: 95,
        result: 'absolute-success',
        healingType: 'medicine-absolute',
        context: 'strategic',
      });
    });

    it('rejects healers of another game or not found', async () => {
      const outsider = character('outsider', { gameId: 'game-002' });
      const { store, tables, maneuvers } = setup([withInjury(), outsider]);
      const handler = new TreatInjuryHandler(store, tables, maneuvers, {} as never);
      await expect(handler.execute(treat({ healerCharacterId: 'outsider' }))).rejects.toMatchObject({
        code: 'err-healer-not-in-game',
      });
      await expect(handler.execute(treat({ healerCharacterId: 'missing' }))).rejects.toMatchObject({ code: 'err-healer-not-found' });
      await expect(handler.execute(treat({}))).rejects.toMatchObject({ code: 'err-healer-required' });
    });

    it('adds the herbalism bonus to the Medicine roll after a successful Herbalism roll', async () => {
      const { store, tables, maneuvers, rolls } = setup([withInjury()], ['success', 'success']);
      const result = await new TreatInjuryHandler(store, tables, maneuvers, {} as never).execute(
        treat({ healer: { name: 'Village healer', bonus: 20, herbalismBonus: 15 }, herbalism: { roll: 60 } }),
      );
      expect(rolls).toEqual([60 + 15, 70 + 20 + TABLES.herbalismBonus]);
      expect(result.injuries[0].treatments[0]).toMatchObject({
        healer: { external: true, name: 'Village healer' },
        healingType: 'magic-or-herbs',
      });
    });

    it('worsens the penalty on an absolute failure and stores the partial success modifier', async () => {
      const { store, tables, maneuvers } = setup([withInjury()], ['absolute-failure']);
      const result = await new TreatInjuryHandler(store, tables, maneuvers, {} as never).execute(
        treat({ healer: { name: 'Quack', bonus: 0 } }),
      );
      expect(result.injuries[0]).toMatchObject({ penalty: -20, initialPenalty: -20 });
      expect(result.injuries[0].treatments[0]).toMatchObject({ result: 'absolute-failure', healingType: 'none' });

      const partial = setup([withInjury()], ['partial-success']);
      const treated = await new TreatInjuryHandler(partial.store, partial.tables, partial.maneuvers, {} as never).execute(
        treat({ healer: { name: 'Quack', bonus: 0 } }),
      );
      expect(treated.injuries[0].treatments[0]).toMatchObject({ result: 'partial-success', recoveryModifier: -25 });
    });

    it('computes the difficulty on the server from the core table unless the game master overrides it (D4/D5)', async () => {
      const head = character('patient');
      head.injuries = [injury({ id: 'i-1', location: 'head' })];
      const { store, tables, maneuvers, rolls } = setup([head], ['success', 'success'], DIFFICULTY_TABLES);
      const handler = new TreatInjuryHandler(store, tables, maneuvers, {} as never);
      // splint is easy (+20), one step harder on the head: light (+10)
      const result = await handler.execute(treat({ healer: { name: 'Healer', bonus: 10 } }));
      expect(rolls).toEqual([70 + 10 + 10]);
      expect(result.injuries[0].treatments[0]).toMatchObject({ difficulty: 10, difficultySource: 'table' });
      const overridden = await handler.execute(treat({ healer: { name: 'Healer', bonus: 10 }, difficulty: -30 }));
      expect(rolls[1]).toBe(70 + 10 - 30);
      expect(overridden.injuries[0].treatments[1]).toMatchObject({ difficulty: -30, difficultySource: 'override' });
      // No row for dressing a bone: refused unless the game master sets the difficulty
      await expect(handler.execute(treat({ procedure: 'dress', healer: { name: 'Healer', bonus: 10 } }))).rejects.toMatchObject({
        code: 'err-treatment-not-applicable',
      });
      await expect(
        handler.execute(treat({ procedure: 'dress', healer: { name: 'Healer', bonus: 10 }, difficulty: 0 })),
      ).resolves.toBeDefined();
    });

    it('subtracts the injury penalties of a healer character from its Medicine and Herbalism (D10)', async () => {
      const healer = character('healer', { skills: [ranked('medicine', 5, 35), ranked('herbalism', 2, 12)] });
      healer.injuries = [injury({ id: 'h-1', penalty: -15 }), injury({ id: 'h-2', penalty: -40, status: 'healed' })];
      const { store, tables, maneuvers, rolls } = setup([withInjury(), healer], ['success', 'success']);
      const result = await new TreatInjuryHandler(store, tables, maneuvers, {} as never).execute(
        treat({ healerCharacterId: 'healer', difficulty: 0, herbalism: { roll: 50, healerCharacterId: 'healer' } }),
      );
      expect(rolls).toEqual([50 + 12 - 15, 70 + 35 - 15 + TABLES.herbalismBonus]);
      expect(result.injuries[0].treatments[0].healer).toMatchObject({ bonus: 35, penalty: -15 });
    });

    it('treats the injuries of a dead character (D9) and rejects stitches on a severe injury (D2)', async () => {
      const dead = withInjury();
      dead.status = 'dead';
      const { store, tables, maneuvers, absolute } = setup([dead]);
      const handler = new TreatInjuryHandler(store, tables, maneuvers, {} as never);
      await expect(handler.execute(treat({ healer: { name: 'Healer', bonus: 10 } }))).resolves.toBeDefined();
      dead.injuries[0].severity = 'severe';
      absolute.mockClear();
      await expect(handler.execute(treat({ procedure: 'stitches', healer: { name: 'Healer', bonus: 10 } }))).rejects.toMatchObject({
        code: 'err-treatment-invalid-severity',
      });
      expect(absolute).not.toHaveBeenCalled();
    });

    it('takes a cauterization from Table 13-1c of core and does not worsen the penalty on its absolute failure', async () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', bleeding: 4 })];
      // The medical table says success; the band of the total (5 + 10 - 20) is the absolute failure of the invented 13-1c
      const { store, tables, maneuvers } = setup([patient], ['success'], { ...TABLES, ...SPEC_068_TABLES });
      const result = await new TreatInjuryHandler(store, tables, maneuvers, {} as never).execute(
        treat({ procedure: 'cauterize', roll: 5, healer: { name: 'Healer', bonus: 10 } }),
      );
      expect(result.injuries[0]).toMatchObject({ penalty: -10, bleeding: 4 });
      expect(result.injuries[0].treatments[0]).toMatchObject({
        result: 'absolute-failure',
        heatCritical: 'E',
        heatHitsDice: 3,
        difficulty: -20,
      });
      expect(result.injuries[0].treatments[0]).not.toHaveProperty('unusualEvent');
    });

    it('marks the unusual roll of a cauterization and refuses it without the core table (spec 068)', async () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', bleeding: 4 })];
      const { store, tables, maneuvers } = setup([patient], [], { ...TABLES, ...SPEC_068_TABLES });
      const result = await new TreatInjuryHandler(store, tables, maneuvers, {} as never).execute(
        treat({ procedure: 'cauterize', roll: 77, healer: { name: 'Healer', bonus: 10 } }),
      );
      expect(result.injuries[0]).toMatchObject({ bleeding: 0, bleedingControl: 'cauterized' });
      expect(result.injuries[0].treatments[0]).toMatchObject({ result: 'success', heatCritical: 'B', unusualEvent: true });
      const other = character('patient');
      other.injuries = [injury({ id: 'i-1', bleeding: 4 })];
      const old = setup([other]);
      await expect(
        new TreatInjuryHandler(old.store, old.tables, old.maneuvers, {} as never).execute(
          treat({ procedure: 'cauterize', healer: { name: 'Healer', bonus: 10 } }),
        ),
      ).rejects.toMatchObject({ code: 'err-cauterization-table-missing' });
    });

    it('casts a leg with crutches, keeps a salve modifier in range and refuses what needs surgery (spec 068)', async () => {
      const patient = character('patient');
      patient.injuries = [
        injury({ id: 'i-1', location: 'leg' }),
        injury({ id: 'i-2', type: 'skin-tissue' }),
        injury({ id: 'i-3', type: 'organ', severity: 'medium' }),
      ];
      const { store, tables, maneuvers, absolute } = setup([patient], [], { ...TABLES, ...SPEC_068_TABLES });
      const handler = new TreatInjuryHandler(store, tables, maneuvers, {} as never);
      const healer = { name: 'Healer', bonus: 10 };
      const cast = await handler.execute(treat({ procedure: 'cast', castSupport: 'crutches', healer }));
      expect(cast.findInjury('i-1')).toMatchObject({ limits: { pace: 'run', maneuverPenaltyFactor: 0.25 } });
      expect(cast.findInjury('i-1').treatments[0]).toMatchObject({ castSupport: 'crutches' });

      const command = (injuryId: string, procedure: 'salve' | 'dress', salveModifier?: number) =>
        new TreatInjuryCommand(
          'patient',
          injuryId,
          procedure,
          undefined,
          healer,
          70,
          undefined,
          undefined,
          undefined,
          MASTER,
          ['rmu-user'],
          undefined,
          undefined,
          salveModifier,
        );
      const withSalve = (value: number) => command('i-2', 'salve', value);
      await expect(handler.execute(withSalve(36))).rejects.toMatchObject({ code: 'err-treatment-salve-modifier-range' });
      const salved = await handler.execute(withSalve(20));
      expect(salved.findInjury('i-2').treatments[0]).toMatchObject({ procedure: 'salve', salveModifier: 20 });

      absolute.mockClear();
      const organ = command('i-3', 'dress');
      await expect(handler.execute(organ)).rejects.toMatchObject({ code: 'err-treatment-surgery-required' });
      expect(absolute).not.toHaveBeenCalled();
    });

    it('treats with magic without a Medicine roll and honours the requested type of healing', async () => {
      const { store, tables, maneuvers, absolute } = setup([withInjury()]);
      const handler = new TreatInjuryHandler(store, tables, maneuvers, {} as never);
      const result = await handler.execute(
        treat({ procedure: 'magic', roll: undefined, healer: { name: 'Priest', bonus: 0 }, healingType: 'magic-and-herbs' }),
      );
      expect(absolute).not.toHaveBeenCalled();
      expect(result.injuries[0].treatments[0]).toMatchObject({ result: 'success', healingType: 'magic-and-herbs' });
      await expect(handler.execute(treat({ roll: undefined, healer: { name: 'Quack', bonus: 0 } }))).rejects.toMatchObject({
        code: 'err-treatment-roll-required',
      });
    });
  });

  describe('recovery, permanent and rest', () => {
    it('rolls recovery with body development, Co, healing type, penalty, race and talents', async () => {
      const patient = character('patient');
      patient.info.recoveryMultiplier = 2;
      patient.traits = [trait('fast-healer')];
      patient.injuries = [injury({ id: 'i-1', severity: 'medium', penalty: -10, treatments: [treatment({ healingType: 'medicine' })] })];
      const { store, tables } = setup([patient]);
      const handler = new RollInjuryRecoveryHandler(store, tables);
      const { character: result, permanentCheckRequired } = await handler.execute(
        new RollInjuryRecoveryCommand('patient', 'i-1', 44, MASTER, []),
      );
      // 44 + 4 ranks + 6 Co + 0 medicine - 10 penalty = 44 -> 10 days (bone) x3 medium x (2 x 0.5)
      expect(result.injuries[0].recovery).toMatchObject({ roll: 44, modifiers: 0, total: 44, baseDays: 30, multiplier: 1, totalDays: 30 });
      expect(result.injuries[0].status).toBe('recovering');
      expect(permanentCheckRequired).toBe(true);
    });

    it('rolls an untreated injury at the none modifier, always asks for the permanent roll and allows one roll (D3/D10)', async () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', penalty: -10 })];
      const { store, tables } = setup([patient]);
      const handler = new RollInjuryRecoveryHandler(store, tables);
      const first = await handler.execute(new RollInjuryRecoveryCommand('patient', 'i-1', 37, MASTER, []));
      // 37 + 4 ranks + 6 Co - 90 none - 10 penalty = -53 -> first band (30 days, bone)
      expect(first.permanentCheckRequired).toBe(true);
      expect(first.character.injuries[0].recovery).toMatchObject({ total: -53, totalDays: 30, untreated: true });
      await expect(handler.execute(new RollInjuryRecoveryCommand('patient', 'i-1', 90, MASTER, []))).rejects.toMatchObject({
        code: 'err-injury-recovery-rolled',
        statusCode: 409,
      });
      patient.injuries[0].treatments = [treatment({ id: 't-1' })];
      const second = await handler.execute(new RollInjuryRecoveryCommand('patient', 'i-1', 90, MASTER, []));
      expect(second.permanentCheckRequired).toBe(false);
      expect(second.character.injuries[0].recovery).toMatchObject({ treatmentId: 't-1', untreated: false });
    });

    it('requires the recovery before the permanent roll and then stores the permanent penalty', async () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', severity: 'severe', penalty: -40, initialPenalty: -40 })];
      const { store, tables } = setup([patient]);
      const handler = new RollPermanentInjuryHandler(store, tables);
      await expect(handler.execute(new RollPermanentInjuryCommand('patient', 'i-1', 50, MASTER, []))).rejects.toMatchObject({
        code: 'err-injury-recovery-required',
      });
      patient.injuries[0].recovery = {
        roll: 33,
        modifiers: -20,
        total: 13,
        baseDays: 70,
        multiplier: 1,
        totalDays: 70,
        remainingDays: 70,
        startedAt: '',
      };
      const result = await handler.execute(new RollPermanentInjuryCommand('patient', 'i-1', 50, MASTER, []));
      expect(result.injuries[0].permanent).toEqual({ penalty: -24, roll: 50 });
    });

    it('rests hours and days', async () => {
      const patient = character('patient');
      patient.hp.current = 0;
      const { store, tables } = setup([patient]);
      const handler = new RestCharacterHandler(store, new CharacterRestService(tables));
      await expect(handler.execute(new RestCharacterCommand('patient', 0, 0, false, MASTER, []))).rejects.toMatchObject({
        code: 'err-rest-time-required',
      });
      const result = await handler.execute(new RestCharacterCommand('patient', 4, 0, false, MASTER, []));
      expect(result.hp.current).toBe(6);
    });
  });

  describe('GetTreatmentDifficultyHandler', () => {
    it('returns the server difficulty after checking the read access', async () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', type: 'bone', severity: 'severe', location: 'head' })];
      const { tables } = setup([patient], [], DIFFICULTY_TABLES);
      const repository = {
        findById: vi.fn((id: string) => Promise.resolve(id === 'patient' ? patient : null)),
      } as unknown as CharacterRepository;
      const checkRead = vi.fn(() => Promise.resolve());
      const handler = new GetTreatmentDifficultyHandler(repository, tables, { checkRead } as unknown as CharacterAccess);
      await expect(handler.execute(new GetTreatmentDifficultyQuery('patient', 'i-1', 'surgery', MASTER, []))).resolves.toMatchObject({
        grade: 'a',
        headSteps: 1,
        difficulty: -70,
        matched: true,
        applicable: true,
      });
      expect(checkRead).toHaveBeenCalledWith(patient, MASTER, []);
      await expect(handler.execute(new GetTreatmentDifficultyQuery('missing', 'i-1', 'surgery', MASTER, []))).rejects.toMatchObject({
        code: 'err-character-not-found',
      });
      await expect(handler.execute(new GetTreatmentDifficultyQuery('patient', 'nope', 'surgery', MASTER, []))).rejects.toMatchObject({
        code: 'err-injury-not-found',
      });
    });
  });
});

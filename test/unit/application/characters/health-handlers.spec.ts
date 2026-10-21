import { ApplyTacticalOutcomeCommand } from 'src/modules/characters/application/cqrs/commands/apply-tactical-outcome.command';
import { RestCharacterCommand } from 'src/modules/characters/application/cqrs/commands/rest-character.command';
import { RollInjuryRecoveryCommand } from 'src/modules/characters/application/cqrs/commands/roll-injury-recovery.command';
import { RollPermanentInjuryCommand } from 'src/modules/characters/application/cqrs/commands/roll-permanent-injury.command';
import { TreatInjuryCommand } from 'src/modules/characters/application/cqrs/commands/treat-injury.command';
import { ApplyTacticalOutcomeHandler } from 'src/modules/characters/application/cqrs/handlers/apply-tactical-outcome.handler';
import { RestCharacterHandler } from 'src/modules/characters/application/cqrs/handlers/rest-character.handler';
import { RollInjuryRecoveryHandler } from 'src/modules/characters/application/cqrs/handlers/roll-injury-recovery.handler';
import { RollPermanentInjuryHandler } from 'src/modules/characters/application/cqrs/handlers/roll-permanent-injury.handler';
import { TreatInjuryHandler } from 'src/modules/characters/application/cqrs/handlers/treat-injury.handler';
import type { CharacterEventBusPort } from 'src/modules/characters/application/ports/character-event-bus.port';
import type { CharacterRepository } from 'src/modules/characters/application/ports/character.repository';
import type { HealingLogRepository } from 'src/modules/characters/application/ports/healing-log.repository';
import type { HealingTablesClientPort } from 'src/modules/characters/application/ports/healing-tables-client.port';
import type { AbsoluteManeuverResponse, ManeuverClientPort } from 'src/modules/characters/application/ports/maneuver-client.port';
import { CharacterHealthStore } from 'src/modules/characters/application/services/character-health.store';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';
import { CharacterSkill } from 'src/modules/characters/domain/value-objects/character-skill.vo';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { buildCharacter, skill, trait } from '../../domain/characters/traits/character.fixture';
import { injury, TABLES, treatment } from '../../domain/characters/healing/healing.fixture';

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

const setup = (characters: Character[], results: AbsoluteManeuverResponse['result'][] = []) => {
  const byId = new Map(characters.map(c => [c.id, c]));
  const update = jest.fn((_id: string, c: Character) => Promise.resolve(c));
  const characterRepository = {
    findById: jest.fn((id: string) => Promise.resolve(byId.get(id) ?? null)),
    update,
  } as unknown as CharacterRepository;
  const gameRepository = {
    findById: jest.fn(() => Promise.resolve({ id: 'game-001', owner: MASTER } as Game)),
  } as unknown as GameRepository;
  const saveAll = jest.fn(() => Promise.resolve());
  const healingLogRepository = { saveAll } as unknown as HealingLogRepository;
  const publish = jest.fn();
  const eventBus: CharacterEventBusPort = { publish };
  const store = new CharacterHealthStore(characterRepository, gameRepository, healingLogRepository, eventBus);
  const tables: HealingTablesClientPort = { getHealingTables: () => Promise.resolve(TABLES) };
  const queue = [...results];
  const rolls: number[] = [];
  const absolute = jest.fn((roll: number) => {
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
  const maneuvers: ManeuverClientPort = { absolute };
  return { store, tables, maneuvers, rolls, update, saveAll, publish, absolute };
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
      const handler = new ApplyTacticalOutcomeHandler(store);
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
      const handler = new ApplyTacticalOutcomeHandler(store);
      await expect(handler.execute(new ApplyTacticalOutcomeCommand('patient', outcome, 'player-001', ['rmu-user']))).rejects.toMatchObject({
        errorCode: 'err-character-health-forbidden',
      });
      await expect(handler.execute(new ApplyTacticalOutcomeCommand('patient', outcome, MASTER, ['rmu-user']))).resolves.toBeDefined();
    });

    it('rejects an outcome of another character', async () => {
      const { store } = setup([character('patient')]);
      const handler = new ApplyTacticalOutcomeHandler(store);
      await expect(
        handler.execute(new ApplyTacticalOutcomeCommand('patient', { ...outcome, characterId: 'other' }, 'sa', ['rmu-service'])),
      ).rejects.toMatchObject({ errorCode: 'err-outcome-character-mismatch' });
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
      const result = await new TreatInjuryHandler(store, tables, maneuvers).execute(
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
      const handler = new TreatInjuryHandler(store, tables, maneuvers);
      await expect(handler.execute(treat({ healerCharacterId: 'outsider' }))).rejects.toMatchObject({
        errorCode: 'err-healer-not-in-game',
      });
      await expect(handler.execute(treat({ healerCharacterId: 'missing' }))).rejects.toMatchObject({ errorCode: 'err-healer-not-found' });
      await expect(handler.execute(treat({}))).rejects.toMatchObject({ errorCode: 'err-healer-required' });
    });

    it('adds the herbalism bonus to the Medicine roll after a successful Herbalism roll', async () => {
      const { store, tables, maneuvers, rolls } = setup([withInjury()], ['success', 'success']);
      const result = await new TreatInjuryHandler(store, tables, maneuvers).execute(
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
      const result = await new TreatInjuryHandler(store, tables, maneuvers).execute(treat({ healer: { name: 'Quack', bonus: 0 } }));
      expect(result.injuries[0]).toMatchObject({ penalty: -20, initialPenalty: -20 });
      expect(result.injuries[0].treatments[0]).toMatchObject({ result: 'absolute-failure', healingType: 'none' });

      const partial = setup([withInjury()], ['partial-success']);
      const treated = await new TreatInjuryHandler(partial.store, partial.tables, partial.maneuvers).execute(
        treat({ healer: { name: 'Quack', bonus: 0 } }),
      );
      expect(treated.injuries[0].treatments[0]).toMatchObject({ result: 'partial-success', recoveryModifier: -25 });
    });

    it('treats with magic without a Medicine roll and honours the requested type of healing', async () => {
      const { store, tables, maneuvers, absolute } = setup([withInjury()]);
      const handler = new TreatInjuryHandler(store, tables, maneuvers);
      const result = await handler.execute(
        treat({ procedure: 'magic', roll: undefined, healer: { name: 'Priest', bonus: 0 }, healingType: 'magic-and-herbs' }),
      );
      expect(absolute).not.toHaveBeenCalled();
      expect(result.injuries[0].treatments[0]).toMatchObject({ result: 'success', healingType: 'magic-and-herbs' });
      await expect(handler.execute(treat({ roll: undefined, healer: { name: 'Quack', bonus: 0 } }))).rejects.toMatchObject({
        errorCode: 'err-treatment-roll-required',
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

    it('requires the recovery before the permanent roll and then stores the permanent penalty', async () => {
      const patient = character('patient');
      patient.injuries = [injury({ id: 'i-1', severity: 'severe', penalty: -40, initialPenalty: -40 })];
      const { store, tables } = setup([patient]);
      const handler = new RollPermanentInjuryHandler(store, tables);
      await expect(handler.execute(new RollPermanentInjuryCommand('patient', 'i-1', 50, MASTER, []))).rejects.toMatchObject({
        errorCode: 'err-injury-recovery-required',
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
      const handler = new RestCharacterHandler(store, tables);
      await expect(handler.execute(new RestCharacterCommand('patient', 0, 0, false, MASTER, []))).rejects.toMatchObject({
        errorCode: 'err-rest-time-required',
      });
      const result = await handler.execute(new RestCharacterCommand('patient', 4, 0, false, MASTER, []));
      expect(result.hp.current).toBe(6);
    });
  });
});

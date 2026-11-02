import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { HealingCalculator } from '../../../../../src/modules/characters/domain/services/healing/healing-calculator.js';
import { TacticalOutcomeMerger } from '../../../../../src/modules/characters/domain/services/healing/tactical-outcome-merger.js';
import type { CharacterTemporaryModifier } from '../../../../../src/modules/characters/domain/value-objects/temporary-modifier.vo.js';
import { expiresGameDay, isExpired } from '../../../../../src/modules/characters/domain/value-objects/temporary-modifier.vo.js';
import { TacticalOutcomeDto } from '../../../../../src/modules/characters/interfaces/http/dto/tactical-outcome.dto.js';
import { buildCharacter } from '../traits/character.fixture.js';
import { injury, TABLES, treatment } from './healing.fixture.js';

const NOW = '2026-11-02T00:00:00.000Z';

const modifier = (id: string, expires: number | null, props: Partial<CharacterTemporaryModifier> = {}): CharacterTemporaryModifier => ({
  id,
  kind: 'morale',
  value: 5,
  source: 'morale-absolute-success',
  days: expires === null ? null : 10,
  createdAt: NOW,
  tacticalGameId: 'tactical-001',
  expiresGameDay: expires,
  ...props,
});

const patient = (): Character => {
  const character = buildCharacter();
  character.hp.max = 40;
  character.hp.current = 40;
  return character;
};

describe('Spec 068 in strategic', () => {
  describe('temporary modifiers', () => {
    it('expire on the day after the last one they last; null lasts until removed', () => {
      expect(expiresGameDay(30, 10)).toBe(40);
      expect(expiresGameDay(null, 10)).toBeNull();
      expect(isExpired({ expiresGameDay: 40 }, 39)).toBe(false);
      expect(isExpired({ expiresGameDay: 40 }, 40)).toBe(true);
      expect(isExpired({ expiresGameDay: null }, 9999)).toBe(false);
    });

    it('a rest drops the expired ones and records them in the healing log', () => {
      const character = patient();
      character.temporaryModifiers = [modifier('m-1', 5), modifier('m-2', 8), modifier('m-3', null)];
      const result = character.rest(40, 1, NOW, {}, 0, 0, 5);
      expect(result.expiredModifiers).toEqual(['m-1']);
      expect(character.temporaryModifiers.map(m => m.id)).toEqual(['m-2', 'm-3']);
      const log = character.pullHealingLog();
      expect(log).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'manual',
            summary: expect.objectContaining({ action: 'temporary-modifiers-expired', gameDay: 5 }) as unknown,
          }),
          expect.objectContaining({ kind: 'rest', summary: expect.objectContaining({ expiredModifiers: ['m-1'] }) as unknown }),
        ]),
      );
      // Without a day nothing expires
      expect(character.rest(40, 1, NOW, {}).expiredModifiers).toBeUndefined();
    });

    it('the game master removes one; an unknown one is a 404', () => {
      const character = patient();
      character.temporaryModifiers = [modifier('m-1', null, { value: -10, source: 'morale-absolute-failure' })];
      expect(character.removeTemporaryModifier('m-1')).toMatchObject({ value: -10 });
      expect(character.temporaryModifiers).toEqual([]);
      expect(character.pullHealingLog()).toEqual([
        expect.objectContaining({ kind: 'manual', summary: expect.objectContaining({ action: 'temporary-modifier-removed' }) as unknown }),
      ]);
      expect(() => character.removeTemporaryModifier('m-1')).toThrow(expect.objectContaining({ code: 'err-temporary-modifier-not-found' }));
    });

    it('survives the props of the aggregate', () => {
      const character = patient();
      character.temporaryModifiers = [modifier('m-1', 7)];
      expect(Character.fromProps(character.getProps()).temporaryModifiers).toEqual([modifier('m-1', 7)]);
      expect(Character.fromProps({ ...character.getProps(), temporaryModifiers: undefined }).temporaryModifiers).toEqual([]);
    });
  });

  describe('injury limits', () => {
    it('are cleared when the game master heals the injury or sets them to null', () => {
      const character = patient();
      character.injuries = [
        injury({ id: 'i-1', limits: { pace: 'walk' }, reopenOn: 'exertion' }),
        injury({ id: 'i-2', limits: { limbUnusable: true } }),
      ];
      expect(character.updateInjury('i-1', { status: 'healed' })).toMatchObject({ limits: null, reopenOn: null, tourniquet: null });
      expect(character.updateInjury('i-2', { limits: null }).limits).toBeNull();
      expect(character.updateInjury('i-2', { limits: { pace: 'creep' } }).limits).toEqual({ pace: 'creep' });
    });

    it('are cleared when the recovery ends healed, and stay while it goes on', () => {
      const recovering = injury({
        limits: { pace: 'jog' },
        status: 'recovering',
        recovery: {
          roll: 50,
          modifiers: 0,
          total: 50,
          baseDays: 4,
          multiplier: 1,
          totalDays: 4,
          remainingDays: 4,
          startedAt: NOW,
        },
      });
      expect(HealingCalculator.advance(recovering, 1, NOW).injury.limits).toEqual({ pace: 'jog' });
      expect(HealingCalculator.advance(recovering, 4, NOW).injury).toMatchObject({ status: 'healed', limits: null });
    });

    it('a salve adds the modifier of the game master to the recovery roll unless it failed', () => {
      const calculator = new HealingCalculator(TABLES);
      const patient = { bodyDevelopmentRanks: 0, constitutionBonus: 0 };
      const salved = (result: 'success' | 'failure' | 'partial-success') =>
        calculator.recoveryModifiers(
          patient,
          injury({ penalty: 0, treatments: [treatment({ procedure: 'salve', result, salveModifier: 15 })] }),
        );
      expect(salved('success').breakdown).toContainEqual(expect.objectContaining({ key: 'salve', value: 15 }));
      // Same type of healing in both (the fixture treatment): only the salve differs
      expect(salved('success').total - salved('failure').total).toBe(15);
      expect(salved('failure').breakdown.map(entry => entry.key)).not.toContain('salve');
    });
  });

  describe('tactical outcome', () => {
    const base = {
      tacticalGameId: 'tactical-001',
      actorId: 'actor-001',
      characterId: 'character-001',
      name: 'Test',
      hp: { start: 40, end: 40, delta: 0 },
      injuriesAdded: [],
      injuriesUpdated: [],
      injuriesHealed: [],
      conditions: [],
    };

    it('takes the limits, reopening and tourniquet of tactical, keeps the strategic limits when tactical sends none', () => {
      const current = {
        hp: { max: 40, current: 40 },
        status: 'created' as const,
        conditions: [],
        injuries: [injury({ id: 'i-1', limits: { pace: 'walk' } }), injury({ id: 'i-2', limits: { pace: 'walk' } })],
      };
      const fromTactical = injury({
        id: 'i-1',
        limits: { pace: 'creep' },
        reopenOn: 'failed-roll',
        tourniquet: { tightSince: 2, loosenedAt: null },
      });
      const { state, summary } = TacticalOutcomeMerger.merge(
        current,
        { ...base, injuries: [fromTactical, injury({ id: 'i-2' })], injuriesHealed: [] },
        40,
        NOW,
        3,
      );
      expect(state.injuries[0]).toMatchObject({ limits: { pace: 'creep' }, reopenOn: 'failed-roll', tourniquet: { tightSince: 2 } });
      expect(state.injuries[1].limits).toEqual({ pace: 'walk' });
      expect(state.temporaryModifiers).toEqual([]);
      expect(summary).not.toHaveProperty('temporaryModifiersAdded');
      const healed = TacticalOutcomeMerger.merge(current, { ...base, injuries: [], injuriesHealed: ['i-1'] }, 40, NOW);
      expect(healed.state.injuries[0]).toMatchObject({ status: 'healed', limits: null });
    });

    it('adds new temporary modifiers by id with their day of expiry', () => {
      const current = {
        hp: { max: 40, current: 40 },
        status: 'created' as const,
        conditions: [],
        injuries: [],
        temporaryModifiers: [modifier('m-1', 9)],
      };
      const created = {
        id: 'm-2',
        kind: 'fear-rr' as const,
        value: 20,
        source: 'rally-unusual' as const,
        days: 1,
        createdAt: NOW,
        tacticalGameId: null,
      };
      const { state, summary } = TacticalOutcomeMerger.merge(
        current,
        { ...base, injuries: [], temporaryModifiers: [{ ...modifier('m-1', null), days: 99 }, created] },
        40,
        NOW,
        12,
      );
      expect(state.temporaryModifiers).toEqual([modifier('m-1', 9), { ...created, tacticalGameId: 'tactical-001', expiresGameDay: 13 }]);
      expect(summary.temporaryModifiersAdded).toEqual(['m-2']);
    });

    it('the DTO keeps the valid limits, reopening and tourniquet and drops what it does not know', () => {
      const command = TacticalOutcomeDto.toCommand(
        'character-001',
        {
          ...base,
          injuries: [
            {
              ...injury({ id: 'i-1' }),
              limits: { pace: 'walk', limbUnusable: true, maneuverPenaltyFactor: 0.5 },
              reopenOn: 'exertion',
              tourniquet: { tightSince: 3, loosenedAt: 13 },
            },
            {
              ...injury({ id: 'i-2' }),
              limits: { pace: 'teleport' as never },
              reopenOn: 'never' as never,
              tourniquet: { tightSince: 'x' as never, loosenedAt: null },
            },
            { ...injury({ id: 'i-3' }), limits: null, reopenOn: null, tourniquet: null },
          ],
          itemsConsumed: [{ itemId: 'herb-001', amount: 2 }],
          temporaryModifiers: [{ id: 'm-1', kind: 'morale', value: 5, source: 'morale-absolute-success', days: 30 }],
        } as unknown as TacticalOutcomeDto,
        'sa',
        ['rmu-service'],
      );
      const [first, second, third] = command.outcome.injuries;
      expect(first).toMatchObject({
        limits: { pace: 'walk', limbUnusable: true, maneuverPenaltyFactor: 0.5 },
        reopenOn: 'exertion',
        tourniquet: { tightSince: 3, loosenedAt: 13 },
      });
      expect(second.limits).toEqual({});
      expect(second).not.toHaveProperty('reopenOn');
      expect(second).not.toHaveProperty('tourniquet');
      expect(third).toMatchObject({ limits: null, reopenOn: null, tourniquet: null });
      expect(command.outcome.itemsConsumed).toEqual([{ itemId: 'herb-001', amount: 2 }]);
      expect(command.outcome.temporaryModifiers).toEqual([
        expect.objectContaining({ id: 'm-1', days: 30, tacticalGameId: 'tactical-001', createdAt: expect.any(String) as unknown }),
      ]);
    });
  });
});

import { CharacterRestService } from '../../../../../src/modules/characters/application/services/character-rest.service.js';
import type { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { AmputationRules } from '../../../../../src/modules/characters/domain/services/healing/amputation-rules.js';
import { HealingCalculator } from '../../../../../src/modules/characters/domain/services/healing/healing-calculator.js';
import {
  type CharacterHealthState,
  TacticalOutcomeMerger,
} from '../../../../../src/modules/characters/domain/services/healing/tactical-outcome-merger.js';
import type { TacticalCharacterOutcome } from '../../../../../src/modules/characters/domain/value-objects/tactical-game-outcome.vo.js';
import { buildCharacter } from '../traits/character.fixture.js';
import { injury, TABLES, treatment } from './healing.fixture.js';

// Workspace spec 079, block C (C1, C2 and C6) in strategic. Only numbers of §13.1 and §13.2.

const NOW = '2026-11-05T00:00:00.000Z';

const outcome = (props: Partial<TacticalCharacterOutcome> = {}): TacticalCharacterOutcome => ({
  tacticalGameId: 'tactical-079',
  actorId: 'actor-001',
  characterId: 'character-001',
  name: 'Test',
  hp: { start: 30, end: 30, delta: 0 },
  injuries: [],
  injuriesAdded: [],
  injuriesUpdated: [],
  injuriesHealed: [],
  conditions: [],
  ...props,
});

const state = (): CharacterHealthState => ({ hp: { max: 30, current: 30 }, status: 'created', injuries: [], conditions: [] });

const wounded = (hp = 10): Character => {
  const character = buildCharacter({});
  character.hp.max = 50;
  character.hp.current = hp;
  return character;
};

const restService = new CharacterRestService({ getHealingTables: () => Promise.resolve(TABLES) });

/** A recovering injury with its recovery roll, treated or not. */
const recovering = (id: string, untreated: boolean) =>
  injury({
    id,
    penalty: -20,
    initialPenalty: -20,
    status: 'recovering',
    treatments: untreated ? [] : [treatment({ id: `t-${id}` })],
    recovery: {
      roll: 50,
      modifiers: 0,
      total: 50,
      baseDays: 10,
      multiplier: 1,
      totalDays: 10,
      remainingDays: 10,
      startedAt: NOW,
      ...(untreated ? {} : { treatmentId: `t-${id}` }),
      untreated,
    },
  });

describe('amputation (spec 079, C1, §13.1)', () => {
  it('surgical at -50 and emergency at -30, the emergency always cauterized', () => {
    expect(AmputationRules.difficulty('surgical')).toBe(-50);
    expect(AmputationRules.difficulty('emergency')).toBe(-30);
    expect(AmputationRules.cauterized('emergency', false)).toBe(true);
    expect(AmputationRules.cauterized('surgical', undefined)).toBe(false);
    expect(AmputationRules.cauterized('surgical', true)).toBe(true);
  });

  it('the stump is three -40 injuries (bone, muscle, skin) plus a burn when cauterized', () => {
    const base = {
      location: 'arm' as const,
      side: 'left' as const,
      severity: 'medium' as const,
      source: { kind: 'manual' as const },
      now: NOW,
    };
    const surgical = AmputationRules.stumpInjuries({ ...base, method: 'surgical', cauterized: false });
    expect(surgical.map(each => each.type)).toEqual(['bone', 'muscle-tendon', 'skin-tissue']);
    expect(surgical.every(each => each.penalty === -40 && each.location === 'arm' && each.side === 'left')).toBe(true);
    expect(surgical[0].flags).toBeUndefined();
    const emergency = AmputationRules.stumpInjuries({ ...base, method: 'emergency', cauterized: true });
    expect(emergency.map(each => each.type)).toEqual(['bone', 'muscle-tendon', 'skin-tissue', 'cut-burn']);
    // A non-surgical amputation always leaves permanent harm unless the permanent roll is an absolute success
    expect(emergency.every(each => each.flags?.includes('permanent-risk'))).toBe(true);
  });

  it('a failure asks for a D Slash critical one result lower; an absolute failure is system shock (2d10 rounds)', () => {
    expect(AmputationRules.consequence('failure')).toEqual({ critical: { criticalType: 'S', criticalSeverity: 'D', resultShift: -1 } });
    expect(AmputationRules.consequence('absolute-failure')).toEqual({ systemShock: { dice: 2 } });
    expect(AmputationRules.consequence('partial-success')).toEqual({});
    expect(AmputationRules.consequence('success')).toEqual({});
  });

  it('the character keeps the lost limb and the stump injuries, and refuses to lose it twice', () => {
    const character = wounded();
    const stump = AmputationRules.stumpInjuries({
      method: 'emergency',
      location: 'leg',
      side: 'right',
      cauterized: true,
      severity: 'medium',
      source: { kind: 'manual' },
      now: NOW,
    });
    character.amputate({ location: 'leg', side: 'right' }, stump, { method: 'emergency' }, NOW);
    expect(character.lostLimbs).toEqual([{ location: 'leg', side: 'right', at: NOW, cause: 'amputation' }]);
    expect(character.injuries).toHaveLength(4);
    expect(() => character.amputate({ location: 'leg', side: 'right' }, [], {}, NOW)).toThrow(
      expect.objectContaining({ code: 'err-limb-already-lost' }),
    );
    character.stampGameDay(12);
    expect(character.lostLimbs[0].gameDay).toBe(12);
    expect(character.pullHealingLog().map(entry => entry.kind)).toEqual(['amputation']);
  });

  it('closes the bleeding and the tourniquet of the injury that cost the limb', () => {
    const character = wounded();
    character.injuries = [
      injury({ id: 'cut', location: 'arm', side: 'left', bleeding: 6, tourniquet: { tightSince: 1, loosenedAt: null } }),
    ];
    character.amputate({ location: 'arm', side: 'left', injuryId: 'cut' }, [], {}, NOW);
    expect(character.injuries[0]).toMatchObject({ bleeding: 0, bleedingControl: 'cauterized', tourniquet: null });
    expect(character.lostLimbs[0]).toMatchObject({ injuryId: 'cut' });
  });

  it('takes the limbs lost in a tactical game once, with the day of the campaign', () => {
    const character = wounded();
    const lost = { location: 'arm' as const, side: 'right' as const, at: NOW, cause: 'limb-loss' as const };
    character.applyTacticalOutcome(outcome({ lostLimbs: [lost, { ...lost }] }), undefined, 7);
    expect(character.lostLimbs).toEqual([{ ...lost, tacticalGameId: 'tactical-079', gameDay: 7 }]);
    character.applyTacticalOutcome(outcome({ tacticalGameId: 'tactical-080', lostLimbs: [lost] }), undefined, 9);
    expect(character.lostLimbs).toHaveLength(1);
  });
});

describe('healing without rest (spec 079, C2, §13.1)', () => {
  it('an active character only recovers hits in 8 sleep hours a day', async () => {
    const character = wounded(10);
    const result = await restService.apply(character, { days: 2, hours: 0, fullRest: false, active: true });
    // 16 hours of sleep: 8 periods of 2 hours, 10% of 50 each
    expect(result.hpAfter).toBe(50);
    const other = wounded(10);
    const shorter = await restService.apply(other, { days: 1, hours: 0, fullRest: false, active: true });
    expect(shorter.hpAfter).toBe(30);
    // Hours of an active day that is not whole: no sleep
    const partial = await restService.apply(wounded(10), { days: 0, hours: 10, fullRest: false, active: true });
    expect(partial.hpAfter).toBe(10);
  });

  it('untreated injuries do not improve; treated ones count each day once, never as complete rest', async () => {
    const character = wounded(50);
    character.injuries = [recovering('treated', false), recovering('untreated', true)];
    await restService.apply(character, { days: 2, hours: 0, fullRest: true, active: true });
    expect(character.injuries.find(each => each.id === 'treated')!.recovery!.remainingDays).toBe(8);
    expect(character.injuries.find(each => each.id === 'untreated')!.recovery!.remainingDays).toBe(10);
    const resting = wounded(50);
    resting.injuries = [recovering('untreated', true)];
    await restService.apply(resting, { days: 2, hours: 0, fullRest: false });
    expect(resting.injuries[0].recovery!.remainingDays).toBe(8);
  });

  it('a failed strenuous activity makes the injury active again without its recovery', () => {
    const character = wounded();
    character.injuries = [recovering('wound', false)];
    const updated = character.strenuousFailure('wound', false, () => 'severe');
    expect(updated).toMatchObject({ status: 'active', penalty: -20, initialPenalty: -20, severity: 'light' });
    expect(updated.recovery).toBeUndefined();
    expect(updated.strenuousFailure).toMatchObject({ absolute: false, treatmentId: 't-wound' });
  });

  it('an absolute failure doubles the penalty left and its severity follows it', () => {
    const character = wounded();
    character.injuries = [recovering('wound', false)];
    const calculator = new HealingCalculator(TABLES);
    const updated = character.strenuousFailure('wound', true, penalty => calculator.severity(penalty, 0));
    expect(updated).toMatchObject({ penalty: -40, initialPenalty: -40, severity: 'severe' });
    expect(updated.strenuousFailure).toMatchObject({ absolute: true, previousPenalty: -20 });
  });

  it('refuses an injury without a successful treatment', () => {
    const character = wounded();
    character.injuries = [recovering('wound', true)];
    expect(() => character.strenuousFailure('wound', false, () => 'light')).toThrow(
      expect.objectContaining({ code: 'err-injury-not-treated' }),
    );
  });

  it('one recovery roll per treatment: after a strenuous failure the wound is treated again first', () => {
    const character = wounded();
    character.injuries = [recovering('wound', false)];
    const recovery = recovering('wound', false).recovery!;
    expect(() => character.setInjuryRecovery('wound', recovery, false)).toThrow(
      expect.objectContaining({ code: 'err-injury-recovery-rolled' }),
    );
    character.strenuousFailure('wound', false, () => 'light');
    expect(HealingCalculator.needsNewTreatment(character.injuries[0])).toBe(true);
    expect(() => character.setInjuryRecovery('wound', recovery, false)).toThrow(
      expect.objectContaining({ code: 'err-injury-treatment-required' }),
    );
    character.injuries = [{ ...character.injuries[0], treatments: [...character.injuries[0].treatments, treatment({ id: 'again' })] }];
    expect(HealingCalculator.needsNewTreatment(character.injuries[0])).toBe(false);
    expect(character.setInjuryRecovery('wound', { ...recovery, treatmentId: 'again' }, false).status).toBe('recovering');
  });
});

describe('the day of a death (spec 079, C6, §13.2)', () => {
  it('a death of a tactical game keeps the day of the campaign', () => {
    const dead = { id: 'dead-1', status: 'dead' as const, source: { kind: 'critical' as const }, createdAt: NOW };
    const { state: merged } = TacticalOutcomeMerger.merge(state(), outcome({ conditions: [dead] }), 30, NOW, 15);
    expect(merged.conditions).toEqual([expect.objectContaining({ id: 'dead-1', status: 'dead', gameDay: 15 })]);
    const { state: fated } = TacticalOutcomeMerger.merge(state(), outcome({ fate: 'dead' }), 30, NOW, 4);
    expect(fated.conditions[0]).toMatchObject({ status: 'dead', gameDay: 4 });
  });

  it('other conditions get no day from the merge', () => {
    const unconscious = { id: 'u-1', status: 'unconscious' as const, source: { kind: 'critical' as const }, createdAt: NOW };
    const { state: merged } = TacticalOutcomeMerger.merge(state(), outcome({ conditions: [unconscious] }), 30, NOW, 15);
    expect(merged.conditions[0].gameDay).toBeUndefined();
  });
});

import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.aggregate';
import { CharacterUpdatedEvent } from '../../../../../src/modules/characters/domain/events/character.events';
import { TacticalOutcomeDto } from '../../../../../src/modules/characters/interfaces/http/dto/tactical-outcome.dto';
import { NotFoundError, ValidationError } from '../../../../../src/modules/shared/domain/errors/errors';
import { buildCharacter, skill } from '../traits/character.fixture';
import { injury, treatment } from './healing.fixture';

const NOW = '2026-10-22T00:00:00.000Z';

const patient = (): Character => {
  const bodyDevelopment = skill('body-development', null, 5);
  bodyDevelopment.totalBonus = 40;
  const character = buildCharacter({ skills: [bodyDevelopment] });
  character.hp.max = 40;
  character.hp.current = 40;
  return character;
};

const outcome = {
  tacticalGameId: 'tactical-001',
  actorId: 'actor-001',
  characterId: 'character-001',
  name: 'Test',
  hp: { start: 40, end: 25, delta: -15 },
  injuries: [injury({ id: 'i-1', penalty: -20, initialPenalty: -20, severity: 'medium' })],
  injuriesAdded: ['i-1'],
  injuriesUpdated: [],
  injuriesHealed: [],
  conditions: [],
};

describe('Character health', () => {
  it('summarizes penalty, active injuries and bleeding', () => {
    const character = patient();
    character.injuries = [
      injury({ id: 'a', penalty: -10, bleeding: 2 }),
      injury({ id: 'b', penalty: -5, status: 'recovering' }),
      injury({ id: 'c', penalty: -3, status: 'permanent' }),
      injury({ id: 'd', penalty: -50, status: 'healed', bleeding: 4 }),
    ];
    expect(character.healthSummary).toEqual({ injuryPenalty: -18, activeInjuries: 2, bleeding: 2 });
    expect(character.deathThreshold).toBe(40);
    expect(character.bodyDevelopmentRanks).toBe(5);
    expect(character.recoveryMultiplier).toBe(1);
  });

  it('applies a tactical outcome once', () => {
    const character = patient();
    expect(character.applyTacticalOutcome(outcome)).toMatchObject({ hpAfter: 25, injuriesAdded: ['i-1'] });
    expect(character.hp.current).toBe(25);
    expect(character.appliedTacticalGames).toEqual(['tactical-001']);
    expect(character.getUncommittedEvents()[0]).toBeInstanceOf(CharacterUpdatedEvent);
    expect(character.pullHealingLog()).toEqual([expect.objectContaining({ kind: 'tactical-outcome', tacticalGameId: 'tactical-001' })]);

    expect(character.applyTacticalOutcome(outcome)).toBeUndefined();
    expect(character.hp.current).toBe(25);
    expect(character.injuries).toHaveLength(1);
    expect(character.pullHealingLog()).toEqual([]);
  });

  it('keeps the hits totals of the outcome in the healing log, not in the character (spec 013, §1.1)', () => {
    const character = patient();
    const hpBySource = { byKind: { attack: -10, critical: -5 }, byAttacker: [{ attackerId: 'orc', attackerName: 'Orc', amount: -15 }] };
    const hpLog = [
      { id: 'h1', round: 1, phase: 2, amount: -10, kind: 'attack' as const, attackerId: 'orc', at: NOW },
      { id: 'h2', round: 1, phase: 2, amount: -5, kind: 'critical' as const, attackerId: 'orc', criticalKey: 'S-B-50', at: NOW },
    ];

    character.applyTacticalOutcome({ ...outcome, hpLog, hpBySource });

    const [entry] = character.pullHealingLog();
    expect(entry.summary).toMatchObject({ hpBySource, hpLogEntries: 2 });
    expect(entry.summary).not.toHaveProperty('hpLog');
    expect(character).not.toHaveProperty('hpLog');
  });

  it('drops the hits log entries and totals of an unknown shape (spec 013, §1.1)', () => {
    const dto = Object.assign(new TacticalOutcomeDto(), {
      ...outcome,
      hpLog: [
        { id: 'h1', round: 1, amount: -10, kind: 'attack', attackerId: 'orc', extra: 'x', at: NOW },
        { id: 'h2', round: 1, amount: -3, kind: 'nonsense', at: NOW },
        { id: 'h3', round: 'x', amount: -3, kind: 'manual', at: NOW },
      ],
      hpBySource: {
        byKind: { attack: -10, nonsense: -3 },
        byAttacker: [{ attackerId: 'orc', amount: -10, foo: 1 }, { amount: 2 }],
        other: 1,
      },
    });

    const { outcome: applied } = TacticalOutcomeDto.toCommand('character-001', dto, 'user', []);

    expect(applied.hpLog).toEqual([{ id: 'h1', round: 1, amount: -10, kind: 'attack', attackerId: 'orc', at: NOW }]);
    expect(applied.hpBySource).toEqual({ byKind: { attack: -10 }, byAttacker: [{ attackerId: 'orc', amount: -10 }] });
    expect(
      TacticalOutcomeDto.toCommand('character-001', Object.assign(new TacticalOutcomeDto(), outcome), 'user', []).outcome,
    ).not.toHaveProperty('hpLog');
  });

  it('worsens the penalty on a treatment with absolute failure', () => {
    const character = patient();
    character.injuries = [injury({ id: 'a', penalty: -10, initialPenalty: -10 })];
    character.addInjuryTreatment('a', treatment({ result: 'absolute-failure', healingType: 'none' }), 10);
    expect(character.injuries[0]).toMatchObject({ penalty: -20, initialPenalty: -20 });
    expect(character.injuries[0].treatments).toHaveLength(1);
    expect(character.pullHealingLog()[0]).toMatchObject({ kind: 'treatment', injuryId: 'a', healerName: 'Healer' });
  });

  it('stops the bleeding with a successful stitch', () => {
    const character = patient();
    character.injuries = [injury({ id: 'a', bleeding: 3 })];
    character.addInjuryTreatment('a', treatment({ procedure: 'stitches' }));
    expect(character.injuries[0]).toMatchObject({ bleeding: 0, bleedingControl: 'stitches' });
  });

  it('rejects treating unknown or healed injuries', () => {
    const character = patient();
    character.injuries = [injury({ id: 'a', status: 'healed' })];
    expect(() => character.addInjuryTreatment('missing', treatment())).toThrow(NotFoundError);
    expect(() => character.addInjuryTreatment('a', treatment())).toThrow(ValidationError);
  });

  it('requires a recovery roll before the permanent injury roll', () => {
    const character = patient();
    character.injuries = [injury({ id: 'a' })];
    expect(() => character.setInjuryPermanent('a', { penalty: -5, roll: 30 }, {})).toThrow(
      expect.objectContaining({ errorCode: 'err-injury-recovery-required' }) as Error,
    );
  });

  it('rests: heals hits, advances injuries and wakes the character up', () => {
    const character = patient();
    character.hp.current = -5;
    character.conditions = [{ id: 'u', status: 'unconscious', source: { kind: 'critical' }, createdAt: NOW }];
    character.injuries = [
      injury({
        id: 'a',
        treatments: [treatment()],
        status: 'recovering',
        recovery: { roll: 50, modifiers: 0, total: 50, baseDays: 2, multiplier: 1, totalDays: 2, remainingDays: 2, startedAt: NOW },
      }),
    ];
    const result = character.rest(15, 2, NOW, {});
    expect(result).toMatchObject({ hpBefore: -5, hpAfter: 15, resolvedConditions: ['u'] });
    expect(character.injuries[0]).toMatchObject({ status: 'healed', penalty: 0 });
    expect(character.conditions[0].resolvedAt).toBe(NOW);
  });

  it('keeps the character unconscious while the hits are not above 0', () => {
    const character = patient();
    character.hp.current = -20;
    character.conditions = [{ id: 'u', status: 'unconscious', source: { kind: 'critical' }, createdAt: NOW }];
    character.rest(-10, 0, NOW, {});
    expect(character.conditions[0].resolvedAt).toBeUndefined();
  });

  it('brings a dead character back when its death is resolved', () => {
    const character = patient();
    character.applyTacticalOutcome({ ...outcome, fate: 'dead' });
    expect(character.status).toBe('dead');
    const dead = character.conditions.find(c => c.status === 'dead')!;
    character.resolveCondition(dead.id);
    expect(character.status).toBe('created');
    expect(() => character.resolveCondition(dead.id)).toThrow(ValidationError);
    expect(() => character.resolveCondition('missing')).toThrow(expect.objectContaining({ errorCode: 'err-condition-not-found' }) as Error);
  });

  it('edits an injury and marks it permanent with its whole penalty when there is no permanent part', () => {
    const character = patient();
    character.injuries = [injury({ id: 'a', penalty: -25, initialPenalty: -25, severity: 'medium' })];
    character.updateInjury('a', { type: 'organ', description: 'Liver', status: 'permanent' });
    expect(character.injuries[0]).toMatchObject({
      type: 'organ',
      description: 'Liver',
      status: 'permanent',
      penalty: -25,
      permanent: { penalty: -25 },
    });
  });

  it('stores the race recovery multiplier', () => {
    const character = patient();
    character.updateRace({
      raceName: undefined,
      sizeId: undefined,
      stats: undefined,
      resistances: undefined,
      strideBonus: undefined,
      enduranceBonus: undefined,
      recoveryMultiplier: 0.5,
      baseHits: undefined,
      baseAt: undefined,
      skillBonuses: [],
    });
    expect(character.recoveryMultiplier).toBe(0.5);
  });
});

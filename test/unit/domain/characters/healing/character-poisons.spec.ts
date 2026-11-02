import { describe, expect, it } from 'vitest';
import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { PoisonRr, type PoisonRrRules } from '../../../../../src/modules/characters/domain/services/healing/poison-rr.js';
import type { PoisonData, PoisonSeverityRow } from '../../../../../src/modules/characters/domain/value-objects/poison.vo.js';
import { TacticalOutcomeDto } from '../../../../../src/modules/characters/interfaces/http/dto/tactical-outcome.dto.js';
import { ROUNDS_PER_HOUR } from '../../../../../src/modules/characters/domain/value-objects/poison.vo.js';
import { buildCharacter, skill } from '../traits/character.fixture.js';

// Invented rules and rows: the rulebook values live only in the gitignored data directory.
const RULES: PoisonRrRules = {
  requiredTotal: 50,
  attackLevelMultiplier: -2,
  bands: [
    { min: 1, max: 20, severity: 'mild' },
    { min: 21, max: 40, severity: 'moderate' },
    { min: 41, max: null, severity: 'severe' },
  ],
};

const row = (severity: PoisonSeverityRow['severity'], overrides: Partial<PoisonSeverityRow> = {}): PoisonSeverityRow => ({
  category: 'nerve',
  severity,
  start: { min: 1, max: 1, unit: 'round' },
  duration: { min: 1, max: 1, unit: 'hour' },
  penalty: { min: -10, max: -10 },
  hitsPerRound: { min: 5, max: 5 },
  hitsRounds: null,
  condition: null,
  conditionDelay: null,
  conditionDuration: null,
  permanent: false,
  ...overrides,
});

const ROWS = [
  row('mild'),
  row('moderate', { condition: 'coma', duration: { min: 2, max: 2, unit: 'hour' } }),
  row('severe', { start: { min: 1, max: 1, unit: 'hour' }, condition: 'dead', duration: null }),
];

const POISON: PoisonData = { name: 'Test venom', category: 'nerve', level: 5 };

const patient = (): Character => {
  const bodyDevelopment = skill('body-development', null, 5);
  bodyDevelopment.totalBonus = 20;
  const character = buildCharacter({ skills: [bodyDevelopment] });
  character.hp.max = 30;
  character.hp.current = 30;
  return character;
};

const random = () => 0;

describe('PoisonRr (workspace spec 042, decision 8)', () => {
  it('adds the roll, the bonus, the modifiers and the level and finds the severity of the failure', () => {
    const result = PoisonRr.resolve(20, 10, 5, [{ key: 'half-dose', value: 5 }], RULES);
    expect(result).toMatchObject({ total: 25, required: 50, resisted: false, failure: 25, severity: 'moderate' });
    expect(result.breakdown.map(each => each.key)).toEqual(['roll', 'poison-rr', 'attack-level', 'half-dose']);
    // Workspace spec 052: the entries carry their group and rule
    expect(result.breakdown[1]).toMatchObject({ group: 'skill', rule: '§15.6' });
    expect(result.breakdown[2]).toMatchObject({ group: 'target', rule: 'Table 5-6', params: { level: 5 } });
    expect(result.breakdown[3]).toMatchObject({ key: 'half-dose', group: 'situation' });
    expect(PoisonRr.resolve(70, 0, 5, [], RULES)).toMatchObject({ resisted: true, failure: 0 });
    expect(PoisonRr.resolve(70, 0, 5, [], RULES).severity).toBeUndefined();
  });
});

describe('Character poisonings (workspace spec 042)', () => {
  const failed = (severity: 'mild' | 'moderate' | 'severe') => ({ ...PoisonRr.resolve(0, 0, 0, [], RULES), severity, resisted: false });

  it('takes the immediate hits and keeps no hits per round out of the tactical rounds', () => {
    const character = patient();
    const injury = character.poison({ ...POISON, immediateHits: { min: 4, max: 4 } }, { kind: 'manual' }, failed('mild'), ROWS, random)!;
    expect(character.hp.current).toBe(26);
    character.rest(character.hp.current, 0, new Date().toISOString(), {}, 0, 10);
    expect(character.hp.current).toBe(26);
    expect(character.findInjury(injury.id)).toMatchObject({ penalty: -10, status: 'active' });
  });

  it('puts a coma for the stage, out of the hits rule, and ends it with the stage', () => {
    const character = patient();
    const injury = character.poison(POISON, { kind: 'manual' }, failed('moderate'), ROWS, random)!;
    character.rest(character.hp.current, 0, new Date().toISOString(), {}, 0, 1);
    const coma = character.conditions.find(c => c.status === 'unconscious');
    expect(coma).toMatchObject({ source: { kind: 'poison', injuryId: injury.id } });
    expect(coma?.resolvedAt).toBeUndefined();
    character.rest(character.hp.current, 0, new Date().toISOString(), {}, 0, 2 * ROUNDS_PER_HOUR);
    expect(character.conditions.find(c => c.id === coma?.id)?.resolvedAt).toBeDefined();
    expect(character.findInjury(injury.id)).toMatchObject({ status: 'healed', penalty: 0, poison: { finished: true } });
  });

  it('dies at a stage with death, unless an antidote neutralizes it before', () => {
    const dead = patient();
    dead.poison(POISON, { kind: 'manual' }, failed('severe'), ROWS, random);
    dead.rest(dead.hp.current, 0, new Date().toISOString(), {}, 0, ROUNDS_PER_HOUR);
    expect(dead.status).toBe('dead');

    const saved = patient();
    const injury = saved.poison(POISON, { kind: 'manual' }, failed('severe'), ROWS, random)!;
    expect(saved.giveAntidote(injury.id, { source: 'magic', name: 'Neutralize', level: 5 }).neutralized).toBe(true);
    saved.rest(saved.hp.current, 0, new Date().toISOString(), {}, 0, ROUNDS_PER_HOUR);
    expect(saved.status).not.toBe('dead');
  });

  it('keeps the poison block and the spent coatings of a tactical outcome', () => {
    const poison = { name: 'Test venom', category: 'nerve', level: 5, stages: [], elapsedRounds: 12 };
    const command = TacticalOutcomeDto.toCommand(
      'character-001',
      {
        tacticalGameId: 'tactical-001',
        actorId: 'actor-001',
        hp: { start: 30, end: 30, delta: 0 },
        injuries: [
          {
            id: 'i-1',
            type: 'poison-disease',
            severity: 'light',
            penalty: -5,
            initialPenalty: -5,
            source: { kind: 'critical' },
            treatments: [],
            status: 'active',
            createdAt: '2026-10-27T00:00:00.000Z',
            poison,
          },
        ],
        injuriesAdded: ['i-1'],
        injuriesUpdated: [],
        injuriesHealed: [],
        conditions: [],
        items: [{ itemId: 'sword', modifiers: [], coatingSpent: true }],
      } as never,
      'user',
      [],
    );
    expect(command.outcome.injuries[0].poison).toEqual(poison);
    expect(command.outcome.items?.[0]).toMatchObject({ itemId: 'sword', coatingSpent: true });
  });
});

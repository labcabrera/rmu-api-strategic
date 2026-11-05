import { CharacterRestService } from '../../../../../src/modules/characters/application/services/character-rest.service.js';
import type { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import {
  type CharacterHealthState,
  TacticalOutcomeMerger,
} from '../../../../../src/modules/characters/domain/services/healing/tactical-outcome-merger.js';
import { CharacterEndurance } from '../../../../../src/modules/characters/domain/value-objects/character-endurance.vo.js';
import type { TacticalCharacterOutcome } from '../../../../../src/modules/characters/domain/value-objects/tactical-game-outcome.vo.js';
import { TacticalOutcomeDto } from '../../../../../src/modules/characters/interfaces/http/dto/tactical-outcome.dto.js';
import { RestDto } from '../../../../../src/modules/characters/interfaces/http/dto/rest.dto.js';
import { buildCharacter } from '../traits/character.fixture.js';
import { injury, TABLES } from './healing.fixture.js';

// Workspace spec 077, block D in strategic: fatigue round trip and recovery. The §5.5 examples only as numbers.

const NOW = '2026-11-05T00:00:00.000Z';

const outcome = (props: Partial<TacticalCharacterOutcome> = {}): TacticalCharacterOutcome => ({
  tacticalGameId: 'tactical-001',
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

const state = (fatiguePenalty: number): CharacterHealthState => ({
  hp: { max: 30, current: 30 },
  status: 'created',
  injuries: [],
  conditions: [],
  fatiguePenalty,
});

const tired = (fatigue: number): Character => {
  const character = buildCharacter({});
  character.hp.max = 30;
  character.hp.current = 30;
  character.endurance = new CharacterEndurance(0, 0, 0, 0, 0, 0, fatigue);
  return character;
};

const restService = new CharacterRestService({ getHealingTables: () => Promise.resolve(TABLES) });

describe('fatigue from the tactical outcome (spec 077, D10)', () => {
  it('adds the change of the game: 20 -> 35', () => {
    const { state: merged, summary } = TacticalOutcomeMerger.merge(
      state(20),
      outcome({ fatigue: { start: 20, end: 35, delta: 15 } }),
      30,
      NOW,
    );
    expect(merged.fatiguePenalty).toBe(35);
    expect(summary).toMatchObject({ fatigueBefore: 20, fatigueAfter: 35 });
  });

  it('keeps the penalty within 0 and 50', () => {
    expect(
      TacticalOutcomeMerger.merge(state(45), outcome({ fatigue: { start: 45, end: 70, delta: 25 } }), 30, NOW).state.fatiguePenalty,
    ).toBe(50);
    expect(
      TacticalOutcomeMerger.merge(state(5), outcome({ fatigue: { start: 5, end: 0, delta: -10 } }), 30, NOW).state.fatiguePenalty,
    ).toBe(0);
  });

  it('keeps the fatigue when the outcome does not carry it', () => {
    const { state: merged, summary } = TacticalOutcomeMerger.merge(state(12), outcome(), 30, NOW);
    expect(merged.fatiguePenalty).toBe(12);
    expect(summary).not.toHaveProperty('fatigueBefore');
  });

  it('stores it on the character and in the healing log', () => {
    const character = tired(20);
    character.applyTacticalOutcome(outcome({ fatigue: { start: 20, end: 35, delta: 15 } }));
    expect(character.endurance.fatiguePenalty).toBe(35);
    expect(character.pullHealingLog()[0].summary).toMatchObject({ fatigueBefore: 20, fatigueAfter: 35 });
  });

  it('reads the fatigue of the outcome DTO', () => {
    const dto = Object.assign(new TacticalOutcomeDto(), { ...outcome(), fatigue: { start: 1, end: 4, delta: 3 } });
    expect(TacticalOutcomeDto.toCommand('character-001', dto, 'user', []).outcome.fatigue).toEqual({ start: 1, end: 4, delta: 3 });
  });
});

describe('fatigue recovery resting (spec 077, D11)', () => {
  it('takes away a fatigue of 45 in 45 minutes', async () => {
    const character = tired(45);
    const result = await restService.apply(character, { minutes: 45, hours: 0, days: 0, fullRest: false });
    expect(result).toMatchObject({ fatigueBefore: 45, fatigueAfter: 0 });
    expect(character.endurance.fatiguePenalty).toBe(0);
  });

  it('takes away a fatigue of 50 and keeps the injury of the fatigue beyond -50', async () => {
    const character = tired(50);
    character.injuries = [injury({ id: 'fatigue-1', penalty: -15, initialPenalty: -15, source: { kind: 'fatigue' } })];
    await restService.apply(character, { minutes: 50, hours: 0, days: 0, fullRest: false });
    expect(character.endurance.fatiguePenalty).toBe(0);
    expect(character.injuries[0]).toMatchObject({ id: 'fatigue-1', penalty: -15, status: 'active' });
  });

  it('counts the hours of the rest as minutes, and leaves part of it after a short rest', async () => {
    const hours = tired(50);
    expect(await restService.apply(hours, { hours: 1, days: 0, fullRest: false })).toMatchObject({ fatigueBefore: 50, fatigueAfter: 0 });
    const short = tired(30);
    expect(await restService.apply(short, { minutes: 10, hours: 0, days: 0, fullRest: false })).toMatchObject({ fatigueAfter: 20 });
  });

  it('accepts a rest of only minutes and still refuses one without time', () => {
    expect(RestDto.toCommand('c', Object.assign(new RestDto(), { minutes: 5 }), 'u', []).minutes).toBe(5);
    expect(() => CharacterRestService.checkTime(0, 0, 5)).not.toThrow();
    expect(() => CharacterRestService.checkTime(0, 0, 0)).toThrow(expect.objectContaining({ code: 'err-rest-time-required' }));
  });
});

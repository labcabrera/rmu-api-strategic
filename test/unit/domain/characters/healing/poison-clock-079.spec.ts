import { describe, expect, it, vi } from 'vitest';
import { CharacterRestService } from '../../../../../src/modules/characters/application/services/character-rest.service.js';
import { ROUNDS_PER_HOUR, ROUNDS_PER_UNIT } from '../../../../../src/modules/characters/domain/value-objects/poison.vo.js';
import { buildCharacter } from '../traits/character.fixture.js';
import { TABLES } from './healing.fixture.js';

// Workspace spec 079, decision 0.2: a round is 5 seconds (§8.1), 12 a minute.

const restService = new CharacterRestService({ getHealingTables: () => Promise.resolve(TABLES) });

const restedRounds = async (input: { hours: number; days: number; minutes?: number }): Promise<number> => {
  const character = buildCharacter({});
  character.hp.max = 30;
  character.hp.current = 30;
  const rest = vi.spyOn(character, 'rest');
  await restService.apply(character, { ...input, fullRest: false });
  return rest.mock.calls[0][5] as number;
};

describe('poison clock (spec 079, decision 0.2)', () => {
  it('counts 12 rounds a minute', () => {
    expect(ROUNDS_PER_UNIT).toEqual({ round: 1, minute: 12, hour: 720, day: 17280 });
    expect(ROUNDS_PER_HOUR).toBe(720);
  });

  it('advances the poisonings by the rounds of the rest', async () => {
    expect(await restedRounds({ minutes: 5, hours: 0, days: 0 })).toBe(60);
    expect(await restedRounds({ hours: 2, days: 0 })).toBe(1440);
    expect(await restedRounds({ hours: 1, days: 1, minutes: 30 })).toBe(25 * 720 + 360);
  });
});

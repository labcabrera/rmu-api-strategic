import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import { buildCharacter } from '../traits/character.fixture.js';
import { injury } from './healing.fixture.js';

describe('Character.stampGameDay (spec 065)', () => {
  it('stamps the new injuries and the pending log, not the older injuries', () => {
    const built = buildCharacter({});
    const character = Character.fromProps({ ...built.getProps(), injuries: [injury({ id: 'old' })] });
    character.addInjury(injury({ id: 'new' }));

    character.stampGameDay(12);

    expect(character.injuries.find(i => i.id === 'old')?.gameDay).toBeUndefined();
    expect(character.injuries.find(i => i.id === 'new')?.gameDay).toBe(12);
    expect(character.pullHealingLog()).toEqual([expect.objectContaining({ kind: 'manual', gameDay: 12 })]);

    // A later save does not move the day of an injury already stamped
    character.stampGameDay(20);
    expect(character.injuries.find(i => i.id === 'new')?.gameDay).toBe(12);
  });
});

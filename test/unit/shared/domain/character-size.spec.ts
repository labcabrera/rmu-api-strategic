import { CHARACTER_SIZES, getSizeSteps } from '../../../../src/modules/shared/domain/entities/character-size.js';

describe('character sizes (spec 075)', () => {
  it('has the 13 classes of the scale with consecutive indexes', () => {
    expect(CHARACTER_SIZES.map(s => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(CHARACTER_SIZES.slice(-3).map(s => [s.id, s.hitMultiplier])).toEqual([
      ['immense', 6],
      ['behemoth', 7],
      ['leviathan', 8],
    ]);
  });

  it('gives the steps from medium of a known size and null otherwise', () => {
    expect(getSizeSteps('medium')).toBe(0);
    expect(getSizeSteps('small')).toBe(-1);
    expect(getSizeSteps('huge')).toBe(3);
    expect(getSizeSteps('unknown')).toBeNull();
    expect(getSizeSteps(undefined)).toBeNull();
  });
});

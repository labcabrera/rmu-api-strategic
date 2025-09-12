import { CharacterLevelDev } from '../aggregates/character-level-dev.aggregate';

export class CharacterLevelCalculator {
  static calculateUsedDevPoints(cld: Partial<CharacterLevelDev>): number {
    let used = 0;
    for (const values of cld.skills!.values()) {
      used += values.reduce((acc, n) => acc + n, 0);
    }
    return used;
  }
}

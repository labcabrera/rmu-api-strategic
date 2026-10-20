import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';

// Hit multiplier by character size. Mirrors the character sizes table of rmu-api-core (CHARACTER_SIZES.hitMultiplier),
// which is a code constant there and is not exposed by the race client
export const SIZE_HIT_MULTIPLIERS: Record<string, number> = {
  minuscule: 0.25,
  diminutive: 0.5,
  tiny: 0.67,
  small: 0.75,
  medium: 1,
  big: 1.5,
  large: 2,
  huge: 3,
  gigantic: 4,
  enormous: 5,
};

export const getSizeHitMultiplier = (sizeId: string | undefined): number => (sizeId && SIZE_HIT_MULTIPLIERS[sizeId]) || 1;

@Injectable()
export class HPProcessor {
  process(character: Partial<Character>): void {
    if (!character.hp || !character.skills) {
      return;
    }
    const skill = character.skills.find(skill => skill.skillId === 'body-development');
    if (!skill) {
      return;
    }
    // Body development total already includes the race base hits
    const max = Math.round(skill.totalBonus * getSizeHitMultiplier(character.info?.sizeId));
    const initialized = character.hp.current != 0 || character.hp.max != 0;
    if (!initialized) {
      character.hp.max = max;
      character.hp.current = character.hp.max;
    } else {
      const lifeLost = character.hp.max - character.hp.current;
      character.hp.max = max;
      character.hp.current = character.hp.max - lifeLost;
    }
  }
}

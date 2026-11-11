import { Injectable } from '@nestjs/common';
import { CHARACTER_SIZES } from '../../../../../shared/domain/entities/character-size.js';
import { Character } from '../../../aggregates/character.js';
import { effectiveSizeId } from '../../traits/effective-size.js';
import { CharacterEndurance } from '../../../value-objects/character-endurance.vo.js';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';

// Hit multiplier by character size: the character sizes table of rmu-api-core (CHARACTER_SIZES.hitMultiplier), a code
// constant there that the race client does not expose. Workspace spec 077: the whole scale of spec 075
export const SIZE_HIT_MULTIPLIERS: Record<string, number> = Object.fromEntries(CHARACTER_SIZES.map(size => [size.id, size.hitMultiplier]));

export const getSizeHitMultiplier = (sizeId: string | undefined): number => (sizeId && SIZE_HIT_MULTIPLIERS[sizeId]) || 1;

@Injectable()
export class HPProcessor {
  process(character: Partial<Character>): void {
    HPProcessor.processEndurance(character);
    if (!character.hp || !character.skills) {
      return;
    }
    const skill = character.skills.find(skill => skill.skillId === 'body-development');
    if (!skill) {
      return;
    }
    // Body development total already includes the race base hits. Workspace spec 077, C13: the hit multiplier is the
    // one of the size changed by Increased or Decreased Size
    const sizeId = character.info ? effectiveSizeId({ info: character.info, traits: character.traits }) : undefined;
    const max = Math.round(skill.totalBonus * getSizeHitMultiplier(sizeId));
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

  /** Workspace spec 079, D2: Vigorous and Feeble, +10 and -10 per tier to every Endurance roll. */
  static processEndurance(character: Partial<Character>): void {
    if (!character.endurance) {
      if (!character.traits) return;
      character.endurance = CharacterEndurance.empty();
    }
    character.endurance.traitBonus = sumTraitEffects(getTraitEffects(character.traits, 'endurance'));
  }
}

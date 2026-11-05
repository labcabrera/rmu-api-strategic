import { CHARACTER_SIZES } from '../../../../shared/domain/entities/character-size.js';
import type { CharacterTrait } from '../../value-objects/character-trait.vo.js';
import { getEffectiveTraits } from '../character/traits/trait-effect-resolver.js';

export const INCREASED_SIZE_TRAIT = 'increased-size';
export const DECREASED_SIZE_TRAIT = 'decreased-size';

/**
 * Workspace spec 077, C13: the size of the character is the size of its race one step up per tier of Increased Size
 * and one step down per tier of Decreased Size (question 11: from the race, not from Medium), within the scale of
 * workspace spec 075. `info.sizeId` stays the size of the race. An unknown size id is returned as it is.
 */
export function effectiveSizeId(character: { info: { sizeId: string }; traits?: CharacterTrait[] | null }): string {
  const raceSize = CHARACTER_SIZES.find(size => size.id === character.info.sizeId);
  if (!raceSize) return character.info.sizeId;
  const steps = getEffectiveTraits(character.traits).reduce((sum, trait) => {
    if (trait.traitId === INCREASED_SIZE_TRAIT) return sum + (trait.tier ?? 1);
    if (trait.traitId === DECREASED_SIZE_TRAIT) return sum - (trait.tier ?? 1);
    return sum;
  }, 0);
  if (steps === 0) return raceSize.id;
  const indexes = CHARACTER_SIZES.map(size => size.index);
  const index = Math.min(Math.max(...indexes), Math.max(Math.min(...indexes), raceSize.index + steps));
  return CHARACTER_SIZES.find(size => size.index === index)!.id;
}

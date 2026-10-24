import { Injectable } from '@nestjs/common';

import { Character } from '../../../aggregates/character.js';
import { CharacterInitiative } from '../../../value-objects/character-initiative.vo.js';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';

@Injectable()
export class InitiativeProcessor {
  process(character: Character): void {
    const modifiers: Record<string, number> = {};
    modifiers['trait'] = sumTraitEffects(getTraitEffects(character.traits, 'initiative'));
    modifiers['stat'] = character.statistics.qu?.totalBonus || 0;
    modifiers['penalty'] = 0;
    character.initiative = new CharacterInitiative(modifiers);
  }
}

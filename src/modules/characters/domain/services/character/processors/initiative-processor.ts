import { Injectable } from '@nestjs/common';

import { Character } from '../../../aggregates/character.aggregate';
import { CharacterInitiative } from '../../../value-objects/character-initiative.vo';

@Injectable()
export class InitiativeProcessor {
  process(character: Character): void {
    const modifiers: Record<string, number> = {};
    modifiers['trait'] = this.getTraitBonus(character);
    modifiers['stat'] = character.statistics.qu?.totalBonus || 0;
    modifiers['penalty'] = 0;
    character.initiative = new CharacterInitiative(modifiers);
  }

  private getTraitBonus(character: Partial<Character>): number {
    if (!character.traits || character.traits.length === 0) {
      return 0;
    }
    const prodigy = character.traits.find(trait => trait.traitId === 'fast-attack');
    if (prodigy) {
      return 5 * prodigy.tier!;
    }
    return 0;
  }
}

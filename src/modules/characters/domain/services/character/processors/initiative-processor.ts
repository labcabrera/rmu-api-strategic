import { Injectable } from '@nestjs/common';

import { Character } from '../../../aggregates/character.aggregate';
import { CharacterInitiative } from '../../../value-objects/character-initiative.vo';

@Injectable()
export class InitiativeProcessor {
  process(character: Partial<Character>): void {
    if (!character.initiative || !character.statistics || !character.statistics.qu) {
      return;
    }
    const traitBonus = this.getTraitBonus(character);
    const baseBonus = character.statistics.qu?.totalBonus || 0;
    const customBonus = traitBonus;
    const penaltyBonus = 0;
    const totalBonus = baseBonus + penaltyBonus + customBonus;
    character.initiative = new CharacterInitiative(baseBonus, customBonus, penaltyBonus, totalBonus);
  }

  private getTraitBonus(character: Partial<Character>): number {
    if (!character.traits || character.traits.length === 0) {
      return 0;
    }
    const prodigy = character.traits.find((trait) => trait.traitId === 'fast-attack');
    if (prodigy) {
      return 5 * prodigy.tier!;
    }
    return 0;
  }
}

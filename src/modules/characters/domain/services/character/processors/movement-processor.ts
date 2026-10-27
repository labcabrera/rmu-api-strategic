import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.js';
import { getTraitEffects, multiplyTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';

// Slow: never below 5'/round (workspace spec 039)
const MIN_BASE_MOVEMENT_RATE = 5;

@Injectable()
export class MovementProcessor {
  process(character: Character): void {
    if (!character.movement.modifiers) {
      character.movement.modifiers = {} as Record<string, number>;
    }
    const racialStrideBonus = character.movement.modifiers['racial'] || 0;
    character.movement.modifiers['qu'] = (character.statistics.qu?.totalBonus || 0) / 2;
    const traitBonus = sumTraitEffects(getTraitEffects(character.traits, 'movement'));
    if (traitBonus !== 0) {
      character.movement.modifiers['trait'] = traitBonus;
    } else {
      delete (character.movement.modifiers as Partial<Record<string, number>>)['trait'];
    }
    // Bad Leg and Missing Leg multiply the whole rate
    const multiplier = multiplyTraitEffects(getTraitEffects(character.traits, 'movement-multiplier'));
    const rate = (20 + racialStrideBonus + character.movement.modifiers['qu'] + traitBonus) * multiplier;
    character.movement.baseMovementRate = Math.max(MIN_BASE_MOVEMENT_RATE, Math.round(rate * 100) / 100);
    this.setMaxPace(character);
  }

  private setMaxPace(character: Character): void {
    const characterWeight = character.info.weight;
    const equipmentWeight = character.equipment.weight || 0;
    // Overweight counts as 10% encumbrance per tier (workspace spec 039)
    const traitEncumbrance = sumTraitEffects(getTraitEffects(character.traits, 'encumbrance'));
    const percent = (characterWeight === 0 ? 0 : (equipmentWeight / characterWeight) * 100) + traitEncumbrance;
    if (percent <= 15) {
      character.movement.maxPace = 'dash';
    } else if (percent <= 30) {
      character.movement.maxPace = 'sprint';
    } else if (percent <= 45) {
      character.movement.maxPace = 'run';
    } else if (percent <= 60) {
      character.movement.maxPace = 'jog';
    } else if (percent <= 90) {
      character.movement.maxPace = 'walk';
    } else {
      character.movement.maxPace = 'creep';
    }
  }
}

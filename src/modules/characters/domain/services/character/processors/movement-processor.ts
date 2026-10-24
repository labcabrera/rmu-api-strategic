import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver';

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
    character.movement.baseMovementRate = 20 + racialStrideBonus + character.movement.modifiers['qu'] + traitBonus;
    this.setMaxPace(character);
  }

  private setMaxPace(character: Character): void {
    const characterWeight = character.info.weight;
    const equipmentWeight = character.equipment.weight || 0;
    const percent = characterWeight === 0 ? 0 : (equipmentWeight / characterWeight) * 100;
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

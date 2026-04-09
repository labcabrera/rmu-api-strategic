import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';

@Injectable()
export class MovementProcessor {
  process(character: Character): void {
    if (!character.movement.modifiers) {
      character.movement.modifiers = {} as Record<string, number>;
    }
    const racialStrideBonus = character.movement.modifiers['racial'] || 0;
    character.movement.modifiers['qu'] = (character.statistics.qu?.totalBonus || 0) / 2;
    character.movement.baseMovementRate = 20 + racialStrideBonus + character.movement.modifiers['qu'];
    //TODO
    character.movement.maxPace = 'creep';

    const weight = character.equipment.weight || 0;
    const weightAllowance = character.equipment.weightAllowance;
    const constPercent = (weightAllowance ? weight / weightAllowance : 0) * 100;
    if (constPercent <= 15) {
      character.movement.maxPace = 'dash';
    } else if (constPercent <= 30) {
      character.movement.maxPace = 'sprint';
    } else if (constPercent <= 45) {
      character.movement.maxPace = 'run';
    } else if (constPercent <= 60) {
      character.movement.maxPace = 'jog';
    } else if (constPercent <= 90) {
      character.movement.maxPace = 'walk';
    } else {
      character.movement.maxPace = 'creep';
    }
  }
}

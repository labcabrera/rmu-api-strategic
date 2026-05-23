import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';

@Injectable()
export class PowerProcessor {
  process(character: Character): void {
    const usedPower = character.power ? character.power.max - character.power.current : 0;
    if (!character.skills || character.skills.length === 0) {
      return;
    }
    const skill = character.skills.find(skill => skill.skillId === 'power-development');
    if (!skill || skill.totalBonus < 1) {
      return;
    }
    character.power = {
      max: skill.totalBonus,
      current: skill.totalBonus - usedPower,
    };
  }
}

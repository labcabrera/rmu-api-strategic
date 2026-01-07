import { Injectable } from '@nestjs/common';

import { Character } from '../../../aggregates/character.aggregate';
import { CharacterAttack } from '../../../value-objects/character-attack.vo';

@Injectable()
export class AttackProcessor {
  process(character: Partial<Character>): void {
    if (!character.equipment) {
      return;
    }
    const attacks: CharacterAttack[] = [];
    this.calculateAttackBonusSlot(character, attacks, 'mainHand');
    this.calculateAttackBonusSlot(character, attacks, 'offHand');
    character.attacks = attacks;
  }

  private calculateAttackBonusSlot(character: Partial<Character>, attacks: CharacterAttack[], slot: string): void {
    if (!character.items || !character.skills) {
      return;
    }
    const equipment = character.equipment!;
    if (equipment[slot]) {
      const item = character.items.find((e) => e.id == equipment[slot]);
      //TODO check attack shield
      if (item?.weapon) {
        const skillId = item.weapon.skillId;
        const skill = character.skills.find((e) => e.skillId == skillId);
        const skillBonus = skill ? skill.totalBonus : -25;
        const ranks = skill ? skill.ranks : 0;
        const fumble = Math.max(1, item.weapon.fumble - Math.floor(ranks / 5));
        item.weapon.modes.forEach((mode) => {
          const attack: CharacterAttack = {
            attackName: slot,
            attackTable: mode.attackTable,
            sizeAdjustment: mode.sizeAdjustment,
            fumbleTable: mode.fumbleTable,
            fumble: fumble,
            bo: skillBonus,
            type: skillId.startsWith('ranged-') ? 'ranged' : 'melee',
          };
          attacks.push(attack);
        });
      }
    }
  }
}

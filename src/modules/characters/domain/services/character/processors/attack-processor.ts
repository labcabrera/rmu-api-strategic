import { Injectable } from '@nestjs/common';

import { Character } from '../../../entities/character.entity';
import { CharacterAttack } from '../../../entities/character-attack.entity';

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
        const attack: CharacterAttack = {
          attackName: slot,
          attackTable: item.weapon.attackTable,
          sizeAdjustment: item.weapon.sizeAdjustment,
          fumbleTable: this.getFumbleTable(),
          fumble: item.weapon.fumble,
          bo: skillBonus,
        };
        attacks.push(attack);
      }
    }
  }

  //TODO
  private getFumbleTable(): string {
    return 'not-defined-table';
  }
}

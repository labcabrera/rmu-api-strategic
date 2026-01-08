import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { CharacterAttack } from '../../../value-objects/character-attack.vo';
import { DomainError } from 'src/modules/shared/domain/errors';
import { CharacterItemWeapon } from '../../../value-objects/character-item-weapon.vo';
import { CharacterItemWeaponMode } from '../../../value-objects/character-item-weapon-mode.vo';

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
        this.getAvailableModes(character, item.weapon).forEach((mode) => {
          const sizeAdjustment = this.getCharacterSizeAdjustment(character) + mode.sizeAdjustment;
          const attack: CharacterAttack = {
            attackName: slot,
            attackTable: mode.attackTable,
            sizeAdjustment: sizeAdjustment,
            fumbleTable: mode.fumbleTable,
            fumble: fumble,
            weaponFumble: item.weapon!.fumble,
            bo: skillBonus,
            type: skillId.startsWith('ranged-') ? 'ranged' : 'melee',
            defaultAttack: true,
          };
          attacks.push(attack);
        });
      }
    }
  }

  private getAvailableModes(character: Partial<Character>, weapon: CharacterItemWeapon): CharacterItemWeaponMode[] {
    const offHandEquiped = character.equipment?.offHand;
    const hasTwoHandedMode = weapon.modes.find((m) => m.type === 'two-hands');
    return weapon.modes.filter((m) => {
      if (offHandEquiped && m.type === 'two-hands') {
        return false;
      }
      if (hasTwoHandedMode && !offHandEquiped && m.type === 'one-hand') {
        return false;
      }
      return true;
    });
  }

  private getCharacterSizeAdjustment(character: Partial<Character>): number {
    switch (character.info!.sizeId) {
      case 'medium':
        return 0;
      case 'big':
        return 1;
      default:
        throw new DomainError('Unsupported character size');
    }
  }
}

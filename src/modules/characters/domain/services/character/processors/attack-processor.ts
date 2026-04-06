import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { CharacterAttack } from '../../../value-objects/character-attack.vo';
import { DomainError } from 'src/modules/shared/domain/errors/errors';
import { CharacterSkill } from '../../../value-objects/character-skill.vo';
import { ItemWeapon } from 'src/modules/items/domain/value-objects/item-weapon.vo';
import { ItemWeaponMode } from 'src/modules/items/domain/value-objects/item-weapon-mode.vo';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';

@Injectable()
export class AttackProcessor {
  process(character: Character, items: Item[]): void {
    if (!character.equipment) {
      //TODO process unarmed attack
      return;
    }
    const attacks: CharacterAttack[] = [];
    this.calculateAttackBonusSlot(character, attacks, 'mainHand', items);
    this.calculateAttackBonusSlot(character, attacks, 'offHand', items);
    character.attacks = attacks;
  }

  private calculateAttackBonusSlot(character: Character, attacks: CharacterAttack[], slot: string, items: Item[]): void {
    if (!items || !character.skills) {
      return;
    }
    const equipment = character.equipment;
    if (equipment[slot]) {
      const item = items.find((e) => e.id == equipment[slot]);
      //TODO check attack shield
      if (item?.weapon) {
        const skillId = item.weapon.skillId;
        const skill = this.getWeaponSkill(character, item.weapon);
        const skillBonus = skill ? skill.totalBonus : -25;
        const totalBonus = slot === 'offHand' ? skillBonus + this.getOffHandPenalty(character) : skillBonus;
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
            bo: totalBonus,
            type: skillId.startsWith('ranged-') ? 'ranged' : 'melee',
            defaultAttack: true,
          };
          attacks.push(attack);
        });
      }
    }
  }

  private getAvailableModes(character: Character, weapon: ItemWeapon): ItemWeaponMode[] {
    const offHandEquiped = character.equipment.offHand;
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

  private getCharacterSizeAdjustment(character: Character): number {
    switch (character.info.sizeId) {
      case 'medium':
        return 0;
      case 'big':
        return 1;
      case 'small':
        return -1;
      default:
        throw new DomainError('Unsupported character size ' + character.info.sizeId);
    }
  }

  private getWeaponSkill(character: Character, weapon: ItemWeapon): CharacterSkill | undefined {
    const skillId = weapon.skillId;
    if (skillId.indexOf('@') > -1) {
      const baseSkillId = skillId.split('@')[0];
      const specialization = skillId.split('@')[1];
      return character.skills.find((e) => e.skillId == baseSkillId && e.specialization == specialization);
    }
    throw new DomainError('Unsupported weapon skill format');
  }

  private getOffHandPenalty(character: Character): number {
    //TODO check trait and offhand type
    return -10;
  }
}

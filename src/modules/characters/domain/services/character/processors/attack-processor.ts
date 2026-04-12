import { Injectable, Logger } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { CharacterAttack } from '../../../value-objects/character-attack.vo';
import { DomainError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import { CharacterSkill } from '../../../value-objects/character-skill.vo';
import { ItemWeapon } from 'src/modules/items/domain/value-objects/item-weapon.vo';
import { ItemWeaponMode } from 'src/modules/items/domain/value-objects/item-weapon-mode.vo';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { EquipmentSlot } from '../../../value-objects/character-equipment.vo';

const SHIELD_FUMBLE = 4;

@Injectable()
export class AttackProcessor {
  private readonly logger = new Logger(AttackProcessor.name);

  process(character: Character, items: Item[]): void {
    if (!character.equipment || !character.equipment.slots) {
      this.logger.warn(`Character ${character.id} has no equipment slots defined, skipping attack processing`);
      //TODO process unarmed attack
      return;
    }
    const attacks: CharacterAttack[] = [];
    this.calculateAttackBonusSlot(character, attacks, 'mainHand', items);
    this.calculateAttackBonusSlot(character, attacks, 'offHand', items);
    character.attacks = attacks;
  }

  private calculateAttackBonusSlot(character: Character, attacks: CharacterAttack[], slot: EquipmentSlot, items: Item[]): void {
    if (!items || !character.skills) {
      return;
    }
    const slotItemId = character.equipment.slots[slot];
    if (slotItemId) {
      const item = items.find((e) => e.id == slotItemId);
      if (!item) {
        throw new ValidationError(`Item with id ${slotItemId} not found for character ${character.id} in slot ${slot}`);
      }
      if (item.weapon) {
        const skillId = item.weapon.skillId;
        const skill = this.getWeaponSkill(character, item.weapon);
        const skillBonus = skill ? skill.totalBonus : -25;
        const boModifiers: Record<string, number> = {};
        boModifiers['skill'] = skillBonus;
        if (slot === 'offHand') {
          this.getOffHandPenalty(character, boModifiers);
        }
        const totalBonus = Object.values(boModifiers).reduce((sum, bonus) => sum + bonus, 0);
        const ranks = skill ? skill.ranks : 0;
        const fumble = Math.max(1, item.weapon.fumble - Math.floor(ranks / 5));
        this.getAvailableModes(character, item.weapon).forEach((mode) => {
          const meleeRange = this.getMeleeRange(character, mode, item);
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
            meleeRange: meleeRange,
            boModifiers: boModifiers,
          };
          attacks.push(attack);
        });
      } else if (item.shield) {
        const skillBonus = character.getSkillBonus('shield', null);
        const attack: CharacterAttack = {
          attackName: slot,
          attackTable: 'shield',
          sizeAdjustment: 0,
          fumbleTable: 'shield',
          fumble: SHIELD_FUMBLE,
          weaponFumble: SHIELD_FUMBLE,
          bo: skillBonus,
          type: 'melee',
          defaultAttack: true,
          meleeRange: Math.round((character.info.height / 2) * 100) / 100,
          boModifiers: { skill: skillBonus },
        };
        attacks.push(attack);
      }
    }
  }
  private getMeleeRange(character: Character, mode: ItemWeaponMode, item: Item): number | null {
    if (mode.attackTypes?.includes('melee')) {
      return Math.round((character.info.height / 2 + (item.info?.length || 0)) * 100) / 100;
    }
    return null;
  }

  private getAvailableModes(character: Character, weapon: ItemWeapon): ItemWeaponMode[] {
    const offHandEquiped = character.equipment.slots['offHand'] || null;
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

  private getOffHandPenalty(character: Character, modifiers: Record<string, number>) {
    //TODO check light off-hand weapon
    modifiers['offHand'] = -20;
    if (character.traits?.some((t) => t.traitId === 'ambidextrous')) {
      modifiers['ambidextrous'] = 20;
    }
  }
}

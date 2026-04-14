import { Injectable, Logger } from '@nestjs/common';
import { Character, UNRANKED_SKILL_BONUS } from '../../../aggregates/character.aggregate';
import { CharacterAttack } from '../../../value-objects/character-attack.vo';
import { DomainError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import { ItemWeapon } from 'src/modules/items/domain/value-objects/item-weapon.vo';
import { ItemWeaponMode } from 'src/modules/items/domain/value-objects/item-weapon-mode.vo';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { EquipmentSlot } from '../../../value-objects/character-equipment.vo';
import { CharacterSkill } from '../../../value-objects/character-skill.vo';
import { CharacterAttackRange } from '../../../value-objects/character-attack-range.vo';

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
      const item = items.find(e => e.id == slotItemId);
      if (!item) {
        throw new ValidationError(`Item with id ${slotItemId} not found for character ${character.id} in slot ${slot}`);
      }
      if (item.weapon) {
        const skillId = item.weapon.skillId;
        const skill = this.getWeaponSkillBonus(character, item.weapon);
        const boModifiers = this.getBoModifiers(skill, character, slot);
        const fumble = this.getFumble(item.weapon.fumble, skill);
        this.getAvailableModes(character, item.weapon).forEach(mode => {
          const meleeRange = this.getMeleeRange(character, mode, item);
          const sizeAdjustment = this.getCharacterSizeAdjustment(character) + mode.sizeAdjustment;
          const ranges = mode.ranges ? mode.ranges.map(r => new CharacterAttackRange(r.from, r.to, r.bonus)) : null;
          const attack = CharacterAttack.fromProps({
            attackName: slot,
            attackTable: mode.attackTable,
            sizeAdjustment: sizeAdjustment,
            fumbleTable: mode.fumbleTable,
            fumble: fumble,
            weaponFumble: item.weapon!.fumble,
            type: skillId.startsWith('ranged-') ? 'ranged' : 'melee',
            defaultAttack: true,
            meleeRange: meleeRange,
            ranges: ranges,
            boModifiers: boModifiers,
          });
          attacks.push(attack);
        });
      } else if (item.shield) {
        const skill = character.findSkill('shield', null);
        const boModifiers = this.getBoModifiers(skill, character, slot);
        const fumble = this.getFumble(SHIELD_FUMBLE, skill);
        const attack = CharacterAttack.fromProps({
          attackName: slot,
          attackTable: 'shield',
          sizeAdjustment: 0,
          fumbleTable: 'shield',
          fumble: fumble,
          weaponFumble: SHIELD_FUMBLE,
          type: 'melee',
          defaultAttack: true,
          meleeRange: Math.round((character.info.height / 2) * 100) / 100,
          ranges: null,
          boModifiers: boModifiers,
        });
        attacks.push(attack);
      }
    }
  }

  private getBoModifiers(skill: CharacterSkill | null, character: Character, slot: EquipmentSlot): Record<string, number> {
    const modifiers: Record<string, number> = {};
    if (skill) {
      modifiers['skill'] = skill.totalBonus;
    } else {
      modifiers['skill'] = UNRANKED_SKILL_BONUS;
    }
    if (slot === 'offHand') {
      this.getOffHandPenalty(character, modifiers);
    }
    return modifiers;
  }

  private getFumble(baseFumble: number, skill: CharacterSkill | null): number {
    const ranks = skill ? skill.ranks : 0;
    return Math.max(1, baseFumble - Math.floor(ranks / 5));
  }

  private getMeleeRange(character: Character, mode: ItemWeaponMode, item: Item): number | null {
    if (mode.attackTypes?.includes('melee')) {
      return Math.round((character.info.height / 2 + (item.info?.length || 0)) * 100) / 100;
    }
    return null;
  }

  private getModifiers(character: Character, weapon: ItemWeapon): Record<string, number> {
    const modifiers: Record<string, number> = {};
    const skill = this.getWeaponSkillBonus(character, weapon);
    modifiers['skill'] = skill ? skill.totalBonus : -25;
    if (character.equipment.slots['offHand']) {
      this.getOffHandPenalty(character, modifiers);
    }
    return modifiers;
  }

  private getAvailableModes(character: Character, weapon: ItemWeapon): ItemWeaponMode[] {
    const offHandEquiped = character.equipment.slots['offHand'] || null;
    const hasTwoHandedMode = weapon.modes.find(m => m.type === 'two-hands');
    return weapon.modes.filter(m => {
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

  private getWeaponSkillBonus(character: Character, weapon: ItemWeapon): CharacterSkill | null {
    const skillId = weapon.skillId;
    if (skillId.indexOf('@') > -1) {
      const baseSkillId = skillId.split('@')[0];
      const specialization = skillId.split('@')[1];
      return character.findSkill(baseSkillId, specialization);
    }
    throw new DomainError('Unsupported weapon skill format');
  }

  private getOffHandPenalty(character: Character, modifiers: Record<string, number>) {
    //TODO check light off-hand weapon
    modifiers['offHand'] = -20;
    if (character.traits?.some(t => t.traitId === 'ambidextrous')) {
      modifiers['ambidextrous'] = 20;
    }
  }
}

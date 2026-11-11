import { Injectable, Logger } from '@nestjs/common';
import { Character, UNRANKED_SKILL_BONUS } from '../../../aggregates/character.js';
import { CharacterAttack, type WeaponCategory } from '../../../value-objects/character-attack.vo.js';
import { DomainError, ValidationError } from '../../../../../shared/domain/errors/errors.js';
import { ItemWeapon } from '../../../../../items/domain/value-objects/item-weapon.vo.js';
import { ItemWeaponMode } from '../../../../../items/domain/value-objects/item-weapon-mode.vo.js';
import { Item } from '../../../../../items/domain/aggregates/item.js';
import type { EquipmentSlot } from '../../../value-objects/character-equipment.vo.js';
import { CharacterSkill } from '../../../value-objects/character-skill.vo.js';
import { CharacterAttackRange } from '../../../value-objects/character-attack-range.vo.js';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';
import { matchesAttack, matchesWeaponType } from '../traits/trait-specialization-matcher.js';
import { ItemModifiers } from '../../../../../items/domain/value-objects/item-modifier.vo.js';
import { getSizeSteps } from '../../../../../shared/domain/entities/character-size.js';
// Workspace spec 077, C13: the attacks use the size of the race changed by Increased or Decreased Size
import { effectiveSizeId } from '../../traits/effective-size.js';

const SHIELD_FUMBLE = 4;
// Core Law has no fumble column for shield bashes: the one-handed melee one is used (workspace spec 034)
const SHIELD_FUMBLE_TABLE = 'melee-one-hand';
const WRONG_SIZE_PENALTY = -20;
const SHIELD_SKILL_ID = 'shield';

// Workspace spec 076, A8: unarmed attacks, one for each specialization of the unarmed skills with ranks
export const UNARMED_SKILL_IDS = ['unarmed-st', 'unarmed-ag'];
// Attack table of each specialization (report characters-creation.md §6); the rest use their own id
const UNARMED_ATTACK_TABLES: Record<string, string> = {
  strikes: 'unarmed-strikes',
  'sweeps-throws': 'unarmed-sweeps',
  wrestling: 'grapple',
};
// Strategic does not read the attack tables: the fumble and the reach of the attack are the defaults of the spec
const UNARMED_FUMBLE = 3;
const UNARMED_FUMBLE_TABLE = 'unarmed';

@Injectable()
export class AttackProcessor {
  private readonly logger = new Logger(AttackProcessor.name);

  process(character: Character, items: Item[]): void {
    const attacks: CharacterAttack[] = [];
    if (!character.equipment || !character.equipment.slots) {
      this.logger.warn(`Character ${character.id} has no equipment slots defined, only unarmed attacks are processed`);
    } else {
      this.calculateAttackBonusSlot(character, attacks, 'mainHand', items);
      this.calculateAttackBonusSlot(character, attacks, 'offHand', items);
    }
    // Always, even with weapons: the character may choose to fight unarmed
    attacks.push(...this.getUnarmedAttacks(character, attacks.length === 0));
    character.attacks = attacks;
  }

  /**
   * One attack for each specialization of `unarmed-st` and `unarmed-ag` with at least one rank (workspace spec 076,
   * A8). The skill id of the attack is `skill@specialization`, as the weapon attacks. Natural Weaponry is not handled.
   */
  private getUnarmedAttacks(character: Character, defaultAttack: boolean): CharacterAttack[] {
    return (character.skills || [])
      .filter(skill => UNARMED_SKILL_IDS.includes(skill.skillId) && !!skill.specialization && skill.ranks >= 1)
      .map(skill => {
        const specialization = skill.specialization!;
        const skillId = `${skill.skillId}@${specialization}`;
        return CharacterAttack.fromProps({
          attackName: `${skill.skillId}-${specialization}`,
          attackTable: UNARMED_ATTACK_TABLES[specialization] ?? specialization,
          sizeAdjustment: this.getSizeAdjustment(effectiveSizeId(character)) + this.getTraitSizeAdjustment(character, skillId),
          fumbleTable: UNARMED_FUMBLE_TABLE,
          fumble: this.getFumble(character, UNARMED_FUMBLE, skill, skillId),
          weaponFumble: UNARMED_FUMBLE,
          type: 'melee',
          defaultAttack,
          meleeRange: Math.round((character.info.height / 2) * 100) / 100,
          ranges: null,
          boModifiers: this.getBoModifiers(skill, character, 'mainHand', 'melee'),
          twoHanded: false,
          weaponCategory: 'unarmed',
          wrongSize: false,
          skillId,
          strengthWeight: this.getStrengthWeight(skill),
        });
      });
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
      // Spec 019, decision 8: a broken weapon or shield gives no attack.
      const condition = ItemModifiers.condition(item.modifiers);
      if (condition.broken) {
        return;
      }
      if (item.weapon) {
        const skillId = item.weapon.skillId;
        const attackType = skillId.startsWith('ranged-') ? 'ranged' : 'melee';
        const skill = this.getWeaponSkillBonus(character, item.weapon);
        const boModifiers = this.getBoModifiers(skill, character, slot, attackType);
        this.applyItemModifiers(boModifiers, item);
        const fumble = this.getFumble(character, item.weapon.fumble, skill, skillId);
        // A weapon made for another size uses its own size for the attack and gets a BO penalty
        const wielderSize = item.weapon.wielderSize;
        const wrongSize = !!wielderSize && wielderSize !== effectiveSizeId(character);
        if (wrongSize) {
          boModifiers['wrongSize'] = WRONG_SIZE_PENALTY;
        }
        const baseSizeAdjustment =
          this.getSizeAdjustment(wrongSize ? wielderSize : effectiveSizeId(character)) + this.getTraitSizeAdjustment(character, skillId);
        const rangeTraitBonus = this.getTraitRangeBonus(character, skillId);
        this.getAvailableModes(character, item.weapon).forEach(mode => {
          // Workspace spec 041, decision 5: the OB modifier of the mode, such as an improvised weapon penalty
          const modeModifiers = mode.obModifier ? { ...boModifiers, improvised: mode.obModifier } : boModifiers;
          const meleeRange = this.getMeleeRange(character, mode, item);
          const sizeAdjustment = baseSizeAdjustment + mode.sizeAdjustment;
          const rangeFactor = this.getTraitRangeFactor(character, mode);
          const ranges = mode.ranges
            ? mode.ranges.map(r => {
                const bonus = this.getRangeBonus(r.bonus, rangeTraitBonus);
                // Workspace spec 079, D1: Deadeye's share, which rmu-api-tactical shows apart
                return new CharacterAttackRange(
                  this.scaleRange(r.from, rangeFactor),
                  this.scaleRange(r.to, rangeFactor),
                  bonus,
                  bonus - r.bonus,
                );
              })
            : null;
          const attack = CharacterAttack.fromProps({
            attackName: slot,
            attackTable: mode.attackTable,
            sizeAdjustment: sizeAdjustment,
            fumbleTable: mode.fumbleTable,
            fumble: fumble,
            weaponFumble: item.weapon!.fumble,
            type: attackType,
            defaultAttack: true,
            meleeRange: meleeRange,
            ranges: ranges,
            boModifiers: modeModifiers,
            twoHanded: mode.type === 'two-hands',
            weaponCategory: this.getWeaponCategory(item, mode),
            wrongSize: wrongSize,
            skillId: skillId,
            itemId: item.id,
            ...(item.weapon!.tags?.length ? { weaponTags: [...item.weapon!.tags] } : {}),
            strengthWeight: this.getStrengthWeight(skill),
          });
          attacks.push(attack);
        });
      } else if (item.shield) {
        const skill = character.findSkill(SHIELD_SKILL_ID, null);
        const boModifiers = this.getBoModifiers(skill, character, slot, 'melee');
        this.applyItemModifiers(boModifiers, item);
        const fumble = this.getFumble(character, SHIELD_FUMBLE, skill, SHIELD_SKILL_ID);
        const attack = CharacterAttack.fromProps({
          attackName: slot,
          attackTable: 'shield',
          sizeAdjustment: this.getTraitSizeAdjustment(character, SHIELD_SKILL_ID),
          fumbleTable: SHIELD_FUMBLE_TABLE,
          fumble: fumble,
          weaponFumble: SHIELD_FUMBLE,
          type: 'melee',
          defaultAttack: true,
          meleeRange: Math.round((character.info.height / 2) * 100) / 100,
          ranges: null,
          boModifiers: boModifiers,
          twoHanded: false,
          weaponCategory: 'standard',
          wrongSize: false,
          skillId: SHIELD_SKILL_ID,
          itemId: item.id,
          strengthWeight: this.getStrengthWeight(skill),
        });
        attacks.push(attack);
      }
    }
  }

  // Workspace spec 040, decision 10: an unranked skill adds no stat bonus, so it has no weight
  private getStrengthWeight(skill: CharacterSkill | null): number {
    return (skill?.statistics ?? []).filter(stat => stat === 'st').length;
  }

  /** Spec 019: the breakage damage of the item and its other attack modifiers (quality, magic...). */
  private applyItemModifiers(modifiers: Record<string, number>, item: Item): void {
    const breakage = ItemModifiers.condition(item.modifiers).breakagePenalty;
    const bonus = ItemModifiers.bonus(item.modifiers, 'attack');
    if (breakage !== 0) modifiers['breakage'] = breakage;
    if (bonus !== 0) modifiers['item'] = bonus;
  }

  private getBoModifiers(
    skill: CharacterSkill | null,
    character: Character,
    slot: EquipmentSlot,
    attackType: 'melee' | 'ranged',
  ): Record<string, number> {
    const modifiers: Record<string, number> = {};
    if (skill) {
      modifiers['skill'] = skill.totalBonus;
    } else {
      modifiers['skill'] = UNRANKED_SKILL_BONUS;
    }
    if (slot === 'offHand') {
      this.getOffHandPenalty(modifiers);
    }
    this.applyTraitBoModifiers(character, modifiers, slot, attackType);
    return modifiers;
  }

  private applyTraitBoModifiers(
    character: Character,
    modifiers: Record<string, number>,
    slot: EquipmentSlot,
    attackType: 'melee' | 'ranged',
  ): void {
    getTraitEffects(character.traits, 'attack-bo')
      .filter(e => (!e.effect.offHand || slot === 'offHand') && (!e.effect.attackType || e.effect.attackType === attackType))
      .forEach(e => {
        const key = e.effect.key || e.traitId;
        modifiers[key] = (modifiers[key] || 0) + e.value;
      });
  }

  private getTraitSizeAdjustment(character: Character, skillId: string): number {
    const effects = getTraitEffects(character.traits, 'attack-size').filter(e =>
      matchesAttack(e.effect.specialization || 'skill', e.specialization, skillId),
    );
    return sumTraitEffects(effects);
  }

  private getTraitRangeBonus(character: Character, skillId: string): number {
    const effects = getTraitEffects(character.traits, 'attack-range').filter(e =>
      matchesAttack(e.effect.specialization || 'ranged-weapon-type', e.specialization, skillId),
    );
    return sumTraitEffects(effects);
  }

  // Range penalties are reduced by the trait bonus, never above 0
  private getRangeBonus(bonus: number, traitBonus: number): number {
    if (bonus >= 0 || traitBonus <= 0) {
      return bonus;
    }
    return Math.min(0, bonus + traitBonus);
  }

  // Great Arm (thrown) and Nearsighted (all ranged) scale every range by a percentage per tier (workspace spec 039)
  private getTraitRangeFactor(character: Character, mode: ItemWeaponMode): number {
    const percent = sumTraitEffects(
      getTraitEffects(character.traits, 'attack-range-percent').filter(e => !e.effect.thrown || !!mode.attackTypes?.includes('thrown')),
    );
    return Math.max(0, 1 + percent / 100);
  }

  private scaleRange(value: number | null | undefined, factor: number): number {
    if (value === null || value === undefined || factor === 1) {
      return value as number;
    }
    return Math.round(value * factor);
  }

  // Ranks and Weapon Control first (min 1), then Fumbler (workspace spec 039, decision 10)
  private getFumble(character: Character, baseFumble: number, skill: CharacterSkill | null, skillId: string): number {
    const ranks = skill ? skill.ranks : 0;
    let reduction = 0;
    let increase = 0;
    getTraitEffects(character.traits, 'fumble').forEach(e => {
      if (e.value > 0) {
        increase += e.value;
      } else if (!e.effect.specialization) {
        reduction += e.value;
      } else if (matchesWeaponType(e.effect.specialization as 'melee-weapon-type', e.specialization, skillId)) {
        reduction += e.value;
      } else {
        reduction += e.effect.otherwise ?? 0;
      }
    });
    return Math.max(1, baseFumble - Math.floor(ranks / 5) + reduction) + increase;
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
      this.getOffHandPenalty(modifiers);
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

  // 'natural' is reserved for natural and unarmed attacks, which are not generated yet
  private getWeaponCategory(item: Item, mode: ItemWeaponMode): WeaponCategory {
    if (item.itemTypeId === 'dagger') {
      return 'dagger';
    }
    if (mode.sizeAdjustment < 0) {
      return 'light';
    }
    return 'standard';
  }

  // Steps from Medium on the whole size scale, minuscule (-4) to leviathan (+8) (workspace spec 075, decision 1).
  // An unknown id is a data error, not a size: it fails instead of silently attacking as Medium
  private getSizeAdjustment(sizeId: string | undefined): number {
    const steps = getSizeSteps(sizeId);
    if (steps === null) {
      throw new DomainError('Unsupported size ' + sizeId);
    }
    return steps;
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

  private getOffHandPenalty(modifiers: Record<string, number>) {
    //TODO check light off-hand weapon
    modifiers['offHand'] = -20;
  }
}

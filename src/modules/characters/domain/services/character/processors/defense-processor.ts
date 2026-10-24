import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { CharacterShield } from '../../../value-objects/character-defense.vo';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver';
import { ItemModifiers } from 'src/modules/items/domain/value-objects/item-modifier.vo';

@Injectable()
export class DefenseProcessor {
  process(character: Character, items: Item[]): void {
    const naturalArmorTier = sumTraitEffects(getTraitEffects(character.traits, 'natural-armor'));
    this.processArmor(character, items, naturalArmorTier);
    this.processDefensiveBonus(character, items, naturalArmorTier);
    this.processShield(character, items);
    this.processProtect(character);
  }

  private processArmor(character: Character, items: Item[], naturalArmorTier: number): void {
    const defaultAt = this.getNaturalAt(character, naturalArmorTier);
    const armor = character.defense.armor;
    const slots = character.equipment.slots || {};
    armor.bodyAt = this.getLocationAt(slots['body'], items, defaultAt, naturalArmorTier > 0);
    armor.headAt = this.getLocationAt(slots['head'], items, defaultAt, naturalArmorTier > 0);
    armor.armsAt = this.getLocationAt(slots['arms'], items, defaultAt, naturalArmorTier > 0);
    armor.legsAt = this.getLocationAt(slots['legs'], items, defaultAt, naturalArmorTier > 0);
    if (armor.bodyAt === armor.headAt && armor.bodyAt === armor.armsAt && armor.bodyAt === armor.legsAt) {
      armor.at = armor.bodyAt;
      armor.bodyAt = null;
      armor.headAt = null;
      armor.armsAt = null;
      armor.legsAt = null;
    } else {
      armor.at = null;
    }
  }

  // Natural armor raises the unarmored AT to 1 + tier, never below the racial AT
  private getNaturalAt(character: Character, naturalArmorTier: number): number {
    const racialAt = character.defense.armor.racialAt;
    return naturalArmorTier > 0 ? Math.max(racialAt, 1 + naturalArmorTier) : racialAt;
  }

  private getLocationAt(itemId: string | null | undefined, items: Item[], defaultAt: number, naturalArmor: boolean): number {
    const wornAt = this.getItemArmorType(itemId, items);
    if (wornAt === null) {
      return defaultAt;
    }
    return naturalArmor ? Math.max(wornAt, defaultAt) : wornAt;
  }

  private getItemArmorType(itemId: string | null | undefined, items: Item[]): number | null {
    if (!itemId) return null;

    const item = items.find(e => e.id == itemId);
    if (!item || !item.armor || !item.armor.at) {
      throw new ValidationError('Invalid armor item');
    }
    // Spec 019, decision 10: a broken piece, or one damaged beyond -50, no longer protects its area.
    if (ItemModifiers.isUnprotected(ItemModifiers.condition(item.modifiers))) {
      return null;
    }
    return item.armor.at;
  }

  private processDefensiveBonus(character: Character, items: Item[], naturalArmorTier: number): void {
    const modifiers: Record<string, number> = {};
    modifiers['quickness'] = (character.statistics?.qu.totalBonus || 0) * 3;
    const defenseEffects = getTraitEffects(character.traits, 'defense');
    defenseEffects.forEach(e => {
      const key = e.effect.key || e.traitId;
      modifiers[key] = (modifiers[key] || 0) + e.value;
    });
    if (naturalArmorTier > 0) {
      // Natural armor tiers become DB when the worn body armor is heavier
      const bodyAt = this.getItemArmorType(character.equipment.slots?.['body'], items);
      const naturalAt = this.getNaturalAt(character, naturalArmorTier);
      if (bodyAt !== null && bodyAt > naturalAt) {
        modifiers['natural-armor'] = naturalArmorTier;
      }
    }
    const filtered = Object.fromEntries(Object.entries(modifiers).filter(([, value]) => value !== 0));
    character.defense.modifiers = filtered;
    character.defense.defensiveBonus = Object.values(filtered).reduce((sum, value) => sum + value, 0);
  }

  private processShield(character: Character, items: Item[]): void {
    character.defense.shield = null;
    const offHandId: string | null = character.equipment.slots['offHand'] || null;
    if (offHandId) {
      const offHand = items.find(item => item.id === offHandId);
      if (offHand && offHand.shield) {
        // Spec 019, decision 9: breakage damage lowers the shield DB; a broken shield gives none.
        const condition = ItemModifiers.condition(offHand.modifiers);
        if (condition.broken) {
          return;
        }
        const db = Math.max(0, offHand.shield.db + condition.breakagePenalty + ItemModifiers.bonus(offHand.modifiers, 'defense'));
        character.defense.shield = new CharacterShield(db, offHand.shield.blockCount);
      }
    }
  }

  private processProtect(character: Character): void {
    const protectSkill = character.findSkill('protect', null);
    character.defense.protect = protectSkill ? protectSkill.totalBonus : 0;
  }
}

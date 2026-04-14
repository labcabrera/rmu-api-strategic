import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { CharacterShield } from '../../../value-objects/character-defense.vo';

@Injectable()
export class DefenseProcessor {
  process(character: Character, items: Item[]): void {
    this.processArmor(character, items);
    this.processDefensiveBonus(character);
    this.processShield(character, items);
  }

  private processArmor(character: Character, items: Item[]): void {
    const racialAt = character.defense.armor.racialAt;
    const armor = character.defense.armor;
    const slots = character.equipment.slots || {};
    armor.bodyAt = this.getItemArmorTypeOrDefault(slots['body'], items, racialAt);
    armor.headAt = this.getItemArmorTypeOrDefault(slots['head'], items, racialAt);
    armor.armsAt = this.getItemArmorTypeOrDefault(slots['arms'], items, racialAt);
    armor.legsAt = this.getItemArmorTypeOrDefault(slots['legs'], items, racialAt);
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

  private getItemArmorTypeOrDefault(itemId: string | null, items: Item[], defaultAt: number): number {
    if (!itemId) return defaultAt;

    const item = items.find(e => e.id == itemId);
    if (!item || !item.armor || !item.armor.at) {
      throw new ValidationError('Invalid armor item');
    }
    return item.armor.at;
  }

  private processDefensiveBonus(character: Character): void {
    const quBonus = character.statistics?.qu.totalBonus || 0;
    character.defense.defensiveBonus = quBonus * 3;
  }

  private processShield(character: Character, items: Item[]): void {
    character.defense.shield = null;
    const offHandId: string | null = character.equipment.slots['offHand'] || null;
    if (offHandId) {
      const offHand = items.find(item => item.id === offHandId);
      if (offHand && offHand.shield) {
        character.defense.shield = new CharacterShield(offHand.shield.db, offHand.shield.blockCount);
      }
    }
  }
}

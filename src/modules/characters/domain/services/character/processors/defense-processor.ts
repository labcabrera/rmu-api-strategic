import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';

@Injectable()
export class DefenseProcessor {
  process(character: Character, items: Item[]): void {
    this.processArmor(character, items);
    this.processDefensiveBonus(character);
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
      armor.bodyAt = undefined;
      armor.headAt = undefined;
      armor.armsAt = undefined;
      armor.legsAt = undefined;
    } else {
      armor.at = undefined;
    }
  }

  private getItemArmorTypeOrDefault(itemId: string | null, items: Item[], defaultAt: number): number {
    if (!itemId) {
      return defaultAt;
    }
    const item = items.find((e) => e.id == itemId);
    if (!item || !item.armor || !item.armor.at) {
      throw new ValidationError('Invalid armor item');
    }
    return item.armor.at;
  }

  private processDefensiveBonus(character: Partial<Character>): void {
    if (!character.defense) {
      return;
    }
    const quBonus = character.statistics?.qu.totalBonus || 0;
    character.defense.defensiveBonus = quBonus * 3;
  }
}

import { Injectable } from '@nestjs/common';
import { ValidationError } from 'src/modules/shared/domain/errors';
import { CharacterItem } from '../../../entities/character-item.entity';
import { Character } from '../../../entities/character.entity';

@Injectable()
export class DefenseProcessor {
  process(character: Partial<Character>): void {
    this.processArmor(character);
    this.processDefensiveBonus(character);
  }

  private processArmor(character: Partial<Character>): void {
    if (!character.equipment || !character.items || !character.defense) {
      return;
    }
    const eq = character.equipment;
    const items = character.items;
    const racialAt = character.defense.armor.racialAt;
    const armor = character.defense.armor;
    armor.bodyAt = this.getItemArmorTypeOrDefault(eq.body, items, racialAt);
    armor.headAt = this.getItemArmorTypeOrDefault(eq.head, items, racialAt);
    armor.armsAt = this.getItemArmorTypeOrDefault(eq.arms, items, racialAt);
    armor.legsAt = this.getItemArmorTypeOrDefault(eq.legs, items, racialAt);

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

  private getItemArmorTypeOrDefault(itemId: string | undefined, items: CharacterItem[], defaultAt: number): number {
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

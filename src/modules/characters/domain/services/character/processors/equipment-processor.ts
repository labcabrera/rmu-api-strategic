import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { CharacterItem } from '../../../value-objects/character-item.vo';

const baseDifficultyCodes = ['c', 's', 'r', 'e', 'l', 'm', 'h', 'vh', 'xh', 'sf', 'a', 'ni'];

@Injectable()
export class EquipmentProcessor {
  process(character: Partial<Character>): void {
    this.setDefaultCoins(character);
    if (!character.items || character.items.length === 0 || !character.equipment) {
      return;
    }
    const carriedWeight = character.items.filter((item) => item.carried).reduce((sum, item) => sum + item.info.weight, 0);
    character.equipment.weight = carriedWeight;
    this.sortItems(character);

    const armorIds = [] as string[];
    if (character.equipment.body) armorIds.push(character.equipment.body);
    if (character.equipment.head) armorIds.push(character.equipment.head);
    if (character.equipment.arms) armorIds.push(character.equipment.arms);
    if (character.equipment.legs) armorIds.push(character.equipment.legs);

    const armors = character.items.filter((item) => armorIds.includes(item.id));
    let enc = 0;
    let maneuverPenalty = 0;
    let perceptionPenalty = 0;
    let rangedPenalty = 0;
    let difficultyIndex = 0;
    armors.forEach((armorItems) => {
      //TODO change name
      enc += armorItems.armor!.enc || 0;
      maneuverPenalty += armorItems.armor!.maneuver || 0;
      perceptionPenalty += armorItems.armor!.perception || 0;
      rangedPenalty += armorItems.armor!.rangedPenalty || 0;
      difficultyIndex = Math.max(difficultyIndex, baseDifficultyCodes.indexOf(armorItems.armor!.baseDifficulty));
    });

    const armorManeuverSkillBonus = this.getArmorManeuverSkillBonus(character);

    character.equipment.weight = carriedWeight;
    character.equipment.enc = enc;
    character.equipment.baseManeuverPenalty = maneuverPenalty;
    character.equipment.maneuverPenalty = Math.min(0, maneuverPenalty + armorManeuverSkillBonus);
    character.equipment.perceptionPenalty = perceptionPenalty;
    character.equipment.rangedPenalty = rangedPenalty;
    character.equipment.movementBaseDifficulty = baseDifficultyCodes[difficultyIndex];
  }

  private setDefaultCoins(character: Partial<Character>) {
    const goldCoins = character.items?.find((item) => item.itemTypeId === 'gold-coin');
    if (!goldCoins) {
      const item = {
        id: 'gold-coin',
        name: 'Gold Coins',
        itemTypeId: 'gold-coin',
        category: 'coins',
        carried: true,
        info: {
          weight: 0,
        },
        stackable: true,
        amount: 0,
      } as CharacterItem;
      character.items!.push(item);
    }
  }

  private getArmorManeuverSkillBonus(character: Partial<Character>) {
    if (character.skills) {
      const skill = character.skills.find((s) => s.skillId === 'armor-maneuver');
      if (skill) {
        return skill.totalBonus || 0;
      }
    }
    return 0;
  }

  private sortItems(character: Partial<Character>) {
    const categoryOrder = ['weapon', 'shield', 'armor', 'clothes', 'coins'];
    character.items!.sort((a, b) => {
      const aCatIdx = categoryOrder.indexOf(a.category);
      const bCatIdx = categoryOrder.indexOf(b.category);
      if (aCatIdx !== -1 && bCatIdx !== -1) {
        if (aCatIdx !== bCatIdx) return aCatIdx - bCatIdx;
      }
      return a.name.localeCompare(b.name);
    });
  }
}

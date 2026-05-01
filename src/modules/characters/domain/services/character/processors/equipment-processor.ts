import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { CharacterEquipment } from '../../../value-objects/character-equipment.vo';
import { DIFFICULTIES } from '../../../value-objects/difficulty.vo';

@Injectable()
export class EquipmentProcessor {
  process(character: Character, items: Item[]): void {
    if (!character.equipment) {
      character.equipment = CharacterEquipment.empty();
    }
    if (!character.equipment.slots) {
      character.equipment.slots = {} as Record<string, string>;
    }
    this.cleanUp(character, items);

    const tmpCarriedWeight = items.filter(item => item.carried).reduce((sum, item) => sum + item.info.weight, 0);
    const carriedWeight = Math.round(tmpCarriedWeight * 100) / 100;
    character.equipment.weight = carriedWeight;

    const slots = character.equipment.slots || {};
    const armorIds = [] as string[];
    if (slots['body']) armorIds.push(slots['body']);
    if (slots['head']) armorIds.push(slots['head']);
    if (slots['arms']) armorIds.push(slots['arms']);
    if (slots['legs']) armorIds.push(slots['legs']);

    const armors = items.filter(item => armorIds.includes(item.id));

    let enc = 0;
    let maneuverPenalty = 0;
    let perceptionPenalty = 0;
    let rangedPenalty = 0;
    let difficultyIndex = 0;
    armors.forEach(armorItems => {
      //TODO change name
      enc += armorItems.armor!.enc || 0;
      maneuverPenalty += armorItems.armor!.maneuver || 0;
      perceptionPenalty += armorItems.armor!.perception || 0;
      rangedPenalty += armorItems.armor!.rangedPenalty || 0;
      difficultyIndex = Math.max(difficultyIndex, DIFFICULTIES.indexOf(armorItems.armor!.baseDifficulty));
    });
    // round maneuverPenalty to 0 decimals
    maneuverPenalty = Math.round(maneuverPenalty);
    const armorManeuverSkillBonus = this.getArmorManeuverSkillBonus(character);
    character.equipment.weight = carriedWeight;
    character.equipment.encumbrancePenalty = enc;
    character.equipment.baseManeuverPenalty = maneuverPenalty;
    character.equipment.maneuverPenalty = Math.min(0, maneuverPenalty + armorManeuverSkillBonus);
    character.equipment.perceptionPenalty = perceptionPenalty;
    character.equipment.rangedPenalty = rangedPenalty;
    character.equipment.movementBaseDifficulty = DIFFICULTIES[difficultyIndex];
    this.processEncumbrancePenalty(character);
  }

  private processEncumbrancePenalty(character: Character) {
    const carriedWeight = character.equipment.weight || 0;
    const characterWeight = character.info.weight || 0;
    const loadPercent = (carriedWeight / characterWeight) * 100;
    const st = character.statistics.st.totalBonus || 0;
    const wa = 15 + 2 * st;
    const penalty = -Math.floor(loadPercent - wa);
    character.equipment.weightAllowance = Math.floor(((wa * characterWeight) / 100) * 100) / 100;
    character.equipment.encumbrancePenalty = Math.min(0, penalty);
  }

  private getArmorManeuverSkillBonus(character: Partial<Character>) {
    if (character.skills) {
      const skill = character.skills.find(s => s.skillId === 'armor-maneuver');
      if (skill) {
        return skill.totalBonus || 0;
      }
    }
    return 0;
  }

  private cleanUp(character: Character, items: Item[]) {
    for (const slot in character.equipment.slots) {
      if (character.equipment.slots[slot]) {
        const itemId = character.equipment.slots[slot];
        if (!items.find(item => item.id === itemId)) {
          delete character.equipment.slots[slot];
        }
      }
    }
  }
}

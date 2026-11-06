import type { CharacterLoad, EquipmentSlot } from '../../../value-objects/character-equipment.vo.js';
import { ItemArmor } from '../../../../../items/domain/value-objects/item-armor.vo.js';
import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.js';
import { Item } from '../../../../../items/domain/aggregates/item.js';
import { CharacterEquipment } from '../../../value-objects/character-equipment.vo.js';
import { DIFFICULTIES } from '../../../value-objects/difficulty.vo.js';
import { ItemModifiers } from '../../../../../items/domain/value-objects/item-modifier.vo.js';
import { getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';

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

    const equipped = new Set(Object.values(character.equipment.slots).filter((id): id is string => !!id));
    const load = this.load(character, items, equipped);
    character.equipment.weight = Math.round((load.worn + load.carried) * 100) / 100;
    character.equipment.load = load;

    const slots = character.equipment.slots || {};
    const armorIds = [] as string[];
    if (slots['body']) armorIds.push(slots['body']);
    if (slots['head']) armorIds.push(slots['head']);
    if (slots['arms']) armorIds.push(slots['arms']);
    if (slots['legs']) armorIds.push(slots['legs']);

    const armors = items.filter(item => armorIds.includes(item.id));

    let armorEncumbrance = 0;
    let maneuverPenalty = 0;
    let perceptionPenalty = 0;
    let rangedPenalty = 0;
    let difficultyIndex = 0;
    armors.forEach(armorItems => {
      // Workspace spec 077, B1.2: a piece that no longer protects its area does not hinder the casting
      if (!ItemModifiers.isUnprotected(ItemModifiers.condition(armorItems.modifiers))) armorEncumbrance += armorItems.armor!.enc || 0;
      maneuverPenalty += armorItems.armor!.maneuverPenalty || 0;
      // Spec 019, decision 10: the breakage damage of armor is an armor maneuver penalty.
      maneuverPenalty += ItemModifiers.condition(armorItems.modifiers).breakagePenalty;
      perceptionPenalty += armorItems.armor!.perceptionPenalty || 0;
      rangedPenalty += armorItems.armor!.rangedPenalty || 0;
      difficultyIndex = Math.max(difficultyIndex, DIFFICULTIES.indexOf(armorItems.armor!.baseDifficulty));
    });
    // round maneuverPenalty to 0 decimals
    maneuverPenalty = Math.round(maneuverPenalty);
    const armorManeuverSkillBonus = this.getArmorManeuverSkillBonus(character);
    character.equipment.armorEncumbrance = armorEncumbrance;
    character.equipment.baseManeuverPenalty = maneuverPenalty;
    character.equipment.maneuverPenalty = Math.min(0, maneuverPenalty + armorManeuverSkillBonus);
    character.equipment.perceptionPenalty = perceptionPenalty;
    character.equipment.rangedPenalty = rangedPenalty;
    character.equipment.movementBaseDifficulty = DIFFICULTIES[difficultyIndex];
    this.processEncumbrancePenalty(character);
  }

  /**
   * Workspace spec 077, decision B1.1: the load counts what the character carries and what it has equipped in any
   * slot, carried or not. A worn armor piece weighs `weight × body weight / fittedWeight` (B1.3); a stack weighs each
   * of its units (spec 023). With no body weight the percent is 0 (B1.4).
   */
  private load(character: Character, items: Item[], equipped: Set<string>): CharacterLoad {
    const bodyWeight = Math.max(0, character.info.weight || 0);
    let worn = 0;
    let carried = 0;
    for (const item of items) {
      const weight = (item.info?.weight || 0) * item.units;
      if (equipped.has(item.id)) {
        const fitted = item.armor ? ItemArmor.fittedWeightOf(item.armor) : 0;
        worn += item.armor && bodyWeight > 0 ? (weight * bodyWeight) / fitted : weight;
      } else if (item.carried) {
        carried += weight;
      }
    }
    worn = Math.round(worn * 100) / 100;
    carried = Math.round(carried * 100) / 100;
    const percent = bodyWeight > 0 ? Math.floor(((worn + carried) / bodyWeight) * 100 + 1e-9) : 0;
    return { worn, carried, percent };
  }

  /**
   * §5.4: the penalty is the load beyond the allowance (15% + 2 × Strength bonus), never a bonus. Workspace spec 077,
   * B1.4: the allowance is never below 0. Workspace spec 079, D2: Overweight adds 10% per tier to the load and Beast of
   * Burden 10% per tier to the allowance (the same figures as the maximum pace); the dodge keeps the penalty without
   * Beast of Burden (`dodgeEncumbrancePenalty`).
   */
  private processEncumbrancePenalty(character: Character) {
    const characterWeight = Math.max(0, character.info.weight || 0);
    const percent = character.equipment.load?.percent ?? 0;
    const st = character.statistics.st.totalBonus || 0;
    const wa = Math.max(0, 15 + 2 * st);
    const extraLoad = EquipmentProcessor.traitLoadPercent(character);
    const extraAllowance = EquipmentProcessor.traitAllowancePercent(character);
    character.equipment.weightPercent = percent;
    character.equipment.weightAllowance = Math.floor((((wa + extraAllowance) * characterWeight) / 100) * 100) / 100;
    character.equipment.encumbrancePenalty = Math.min(0, -Math.floor(percent + extraLoad - wa - extraAllowance));
    character.equipment.dodgeEncumbrancePenalty = Math.min(0, -Math.floor(percent + extraLoad - wa));
  }

  /** Workspace spec 079, D2: % of the body weight the traits add to the load (Overweight). */
  static traitLoadPercent(character: Pick<Character, 'traits'>): number {
    return sumTraitEffects(getTraitEffects(character.traits, 'encumbrance'));
  }

  /** Workspace spec 079, D2: % of the body weight the traits carry without penalty (Beast of Burden). */
  static traitAllowancePercent(character: Pick<Character, 'traits'>): number {
    return Math.max(0, sumTraitEffects(getTraitEffects(character.traits, 'load-allowance')));
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
    for (const key in character.equipment.slots) {
      const slot = key as EquipmentSlot;
      if (character.equipment.slots[slot]) {
        const itemId = character.equipment.slots[slot];
        if (!items.find(item => item.id === itemId)) {
          delete character.equipment.slots[slot];
        }
      }
    }
  }
}

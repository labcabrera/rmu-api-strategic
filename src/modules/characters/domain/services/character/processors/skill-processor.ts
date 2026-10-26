import type { StatKey } from '../../../value-objects/character-stat.vo.js';
import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.js';
import { CharacterSkill } from '../../../value-objects/character-skill.vo.js';
import { Item } from '../../../../../items/domain/aggregates/item.js';
import { type AppliedTraitEffect, getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';
import { matchesSkill } from '../traits/trait-specialization-matcher.js';
import { DEFAULT_KNACK_BONUS } from '../../../../../games/domain/value-objects/game-power-level.vo.js';
import { characterRealms, REALM_STAT_TOKEN, REALM_STATS } from '../../../value-objects/character-realm.vo.js';
import { rankBonus } from '../../skills/rank-bonus.js';

@Injectable()
export class SkillProcessor {
  process(character: Character, items: Item[]): void {
    const skillEffects = getTraitEffects(character.traits, 'skill');
    character.skills.forEach((skill: CharacterSkill) => this.updateSkill(character, skill, items, skillEffects));
    character.skills.sort((a: CharacterSkill, b: CharacterSkill) => a.skillId.localeCompare(b.skillId));
  }

  private updateSkill(character: Character, skill: CharacterSkill, items: Item[], skillEffects: AppliedTraitEffect[]): void {
    const ranks = skill.ranks;
    const statBonus = this.getStatBonus(character, skill.statistics);
    const racialBonus = skill.racialBonus || 0;
    const developmentBonus = this.getRankBonus(ranks);
    const professionalBonus = this.getProfessionalBonus(skill);

    const traitBonus = this.getTraitBonus(skill, skillEffects);
    const customBonus = this.getArmorPenaltyBonus(character, skill, items);

    const totalBonus = statBonus + racialBonus + professionalBonus + developmentBonus + customBonus + traitBonus;

    skill.professionalBonus = professionalBonus;
    skill.statBonus = statBonus;
    skill.developmentBonus = developmentBonus;
    skill.customBonus = customBonus;
    skill.traitBonus = traitBonus;
    skill.totalBonus = totalBonus;
  }

  private getStatBonus(character: Partial<Character>, statistics: string[]): number {
    let result = 0;
    statistics?.forEach(stat => {
      if (stat === REALM_STAT_TOKEN) {
        result += this.getRealmStatBonus(character);
        return;
      }
      const statValue = character.statistics![stat as StatKey];
      if (statValue?.totalBonus) {
        result += statValue.totalBonus;
      }
    });
    return result;
  }

  // Realm stat bonus: the lowest of the realm stats for a hybrid (Spell Law 4.0)
  private getRealmStatBonus(character: Partial<Character>): number {
    const bonuses = characterRealms(character.info).map(realm => character.statistics?.[REALM_STATS[realm]]?.totalBonus || 0);
    return bonuses.length > 0 ? Math.min(...bonuses) : 0;
  }

  private getProfessionalBonus(skill: CharacterSkill): number {
    let bonus = 0;
    if (skill.professional && skill.professional.includes('professional')) {
      bonus = Math.min(30, skill.ranks);
    }
    if (skill.professional && skill.professional.includes('knack')) {
      bonus += skill.knackBonus ?? DEFAULT_KNACK_BONUS;
    }
    return bonus;
  }

  private getTraitBonus(skill: CharacterSkill, skillEffects: AppliedTraitEffect[]): number {
    const matching = skillEffects.filter(e =>
      e.effect.ids ? e.effect.ids.includes(skill.skillId) : matchesSkill(e.specialization, skill.skillId, skill.specialization),
    );
    return sumTraitEffects(matching);
  }

  private getArmorPenaltyBonus(character: Character, skill: CharacterSkill, items: Item[]): number {
    if (!character.equipment || !character.equipment.slots) {
      return 0;
    }
    const headItemId = character.equipment.slots['head'] || null;
    const armsItemId = character.equipment.slots['arms'] || null;
    if (skill.skillId === 'perception' && headItemId) {
      const headItem = items.find(item => item.id === headItemId && item.armor);
      return headItem ? headItem.armor!.perceptionPenalty : 0;
    } else if (skill.skillId === 'ranged-weapon' && armsItemId) {
      const bodyItem = items.find(item => item.id === armsItemId && item.armor);
      return bodyItem ? bodyItem.armor!.rangedPenalty : 0;
    }
    return 0;
  }

  private getRankBonus(ranks: number): number {
    return rankBonus(ranks);
  }
}

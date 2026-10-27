import type { StatKey } from '../../../value-objects/character-stat.vo.js';
import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.js';
import { CharacterSkill } from '../../../value-objects/character-skill.vo.js';
import { Item } from '../../../../../items/domain/aggregates/item.js';
import { type AppliedTraitEffect, getTraitEffects, sumTraitEffects } from '../traits/trait-effect-resolver.js';
import { matchesSkill } from '../traits/trait-specialization-matcher.js';
import { DEFAULT_KNACK_BONUS } from '../../../../../games/domain/value-objects/game-power-level.vo.js';
import { REALM_STAT_TOKEN } from '../../../value-objects/character-realm.vo.js';
import { realmStatBonus } from '../../realms-rules.js';
import { rankBonus } from '../../skills/rank-bonus.js';
import { isFightingStyleSkill } from '../../../value-objects/fighting-styles.vo.js';
import { trimStyleAbilities } from '../../fighting-styles/style-allocation.js';

@Injectable()
export class SkillProcessor {
  process(character: Character, items: Item[]): void {
    const skillEffects = getTraitEffects(character.traits, 'skill');
    const focusEffects = getTraitEffects(character.traits, 'professional-focus');
    character.skills.forEach((skill: CharacterSkill) => this.updateSkill(character, skill, items, skillEffects, focusEffects));
    character.skills.sort((a: CharacterSkill, b: CharacterSkill) => a.skillId.localeCompare(b.skillId));
  }

  private updateSkill(
    character: Character,
    skill: CharacterSkill,
    items: Item[],
    skillEffects: AppliedTraitEffect[],
    focusEffects: AppliedTraitEffect[],
  ): void {
    const ranks = skill.ranks;
    const statBonus = this.getStatBonus(character, skill.statistics);
    const racialBonus = skill.racialBonus || 0;
    const developmentBonus = this.getRankBonus(ranks);
    const professionalBonus = this.getProfessionalBonus(skill, focusEffects);

    const traitBonus = this.getTraitBonus(skill, skillEffects);
    const customBonus = this.getArmorPenaltyBonus(character, skill, items);

    const totalBonus = statBonus + racialBonus + professionalBonus + developmentBonus + customBonus + traitBonus;

    skill.professionalBonus = professionalBonus;
    skill.statBonus = statBonus;
    skill.developmentBonus = developmentBonus;
    skill.customBonus = customBonus;
    skill.traitBonus = traitBonus;
    skill.totalBonus = totalBonus;
    if (isFightingStyleSkill(skill.skillId)) trimStyleAbilities(skill);
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
    return realmStatBonus(character.info, character.statistics);
  }

  // Professional Skill Focus doubles the professional bonus of one skill: +2 per rank, max +60 (workspace spec 039)
  private getProfessionalBonus(skill: CharacterSkill, focusEffects: AppliedTraitEffect[]): number {
    let bonus = 0;
    if (skill.professional && skill.professional.includes('professional')) {
      const focused = focusEffects.some(e => matchesSkill(e.specialization, skill.skillId, skill.specialization));
      bonus = focused ? Math.min(60, 2 * skill.ranks) : Math.min(30, skill.ranks);
    }
    if (skill.professional && skill.professional.includes('knack')) {
      bonus += skill.knackBonus ?? DEFAULT_KNACK_BONUS;
    }
    return bonus;
  }

  private getTraitBonus(skill: CharacterSkill, skillEffects: AppliedTraitEffect[]): number {
    const knack = !!skill.professional?.includes('knack');
    const matching = skillEffects.filter(e => (!e.effect.requiresKnack || knack) && this.matchesSkillEffect(e, skill));
    return sumTraitEffects(matching);
  }

  // Fixed skills or skill categories, otherwise the trait specialization (a skill, or a skill category)
  private matchesSkillEffect(e: AppliedTraitEffect, skill: CharacterSkill): boolean {
    if (e.effect.ids || e.effect.categories) {
      return !!e.effect.ids?.includes(skill.skillId) || (!!skill.categoryId && !!e.effect.categories?.includes(skill.categoryId));
    }
    if (e.effect.specialization === 'skill-category') {
      return !!skill.categoryId && e.specialization === skill.categoryId;
    }
    return matchesSkill(e.specialization, skill.skillId, skill.specialization);
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

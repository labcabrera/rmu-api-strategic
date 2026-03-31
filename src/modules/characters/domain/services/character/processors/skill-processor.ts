import { Injectable } from '@nestjs/common';
import { Character } from '../../../aggregates/character.aggregate';
import { CharacterSkill } from '../../../value-objects/character-skill.vo';
import { Stat } from '../../../value-objects/character-statistics.vo';

@Injectable()
export class SkillProcessor {
  process(character: Partial<Character>): void {
    if (!character.skills || !character.statistics) {
      return;
    }
    character.skills.forEach((skill: CharacterSkill) => this.updateSkill(character, skill));
    character.skills.sort((a: CharacterSkill, b: CharacterSkill) => a.skillId.localeCompare(b.skillId));
  }

  private updateSkill(character: Partial<Character>, skill: CharacterSkill): void {
    const ranks = skill.ranks;
    const statBonus = this.getStatBonus(character, skill.statistics);
    const racialBonus = skill.racialBonus || 0;
    const developmentBonus = this.getRankBonus(ranks);
    const professionalBonus = this.getProfessionalBonus(character, skill);
    const traitBonus = this.getTraitBonus(character, skill);
    const customBonus = traitBonus;
    const totalBonus = statBonus + racialBonus + professionalBonus + developmentBonus + customBonus;

    skill.professionalBonus = professionalBonus;
    skill.statBonus = statBonus;
    skill.developmentBonus = developmentBonus;
    skill.customBonus = customBonus;
    skill.totalBonus = totalBonus;
  }

  private getStatBonus(character: Partial<Character>, statistics: string[]): number {
    let result = 0;
    statistics?.forEach((stat) => {
      const statValue = character.statistics![stat] as Stat;
      if (statValue?.totalBonus) {
        result += statValue.totalBonus;
      }
    });
    return result;
  }

  private getProfessionalBonus(character: Partial<Character>, skill: CharacterSkill): number {
    let bonus = 0;
    if (skill.professional && skill.professional.includes('professional')) {
      bonus = Math.min(30, skill.ranks);
    }
    if (skill.professional && skill.professional.includes('knack')) {
      bonus += 5;
    }
    return bonus;
  }

  private getRankBonus(ranks: number): number {
    return ranks > 0 ? ranks * 5 : -20;
  }

  private getTraitBonus(character: Partial<Character>, skill: CharacterSkill): number {
    if (!character.traits || character.traits.length === 0) {
      return 0;
    }
    let modifier = 0;
    if (skill.skillId === 'body-development') {
      const tough = character.traits.find((trait) => trait.traitId === 'tough');
      if (tough) {
        modifier = modifier + 5 * tough.tier!;
      }
      const fragile = character.traits.find((trait) => trait.traitId === 'fragile');
      if (fragile) {
        modifier = modifier - 5 * fragile.tier!;
      }
    }
    const prodigy = character.traits.find((trait) => trait.traitId === 'prodigy' && trait.specialization === skill.skillId);
    if (prodigy) {
      if (prodigy.specialization === skill.specialization) {
        modifier = modifier + 5 * prodigy.tier!;
      }
    }
    return modifier;
  }
}

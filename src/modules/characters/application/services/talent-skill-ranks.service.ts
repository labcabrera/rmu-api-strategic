import { Inject, Injectable } from '@nestjs/common';
import type { Character, GrantedSkillRanks } from '../../domain/aggregates/character.js';
import { developmentCostKey, skillStatistics } from '../../domain/services/skills/skill-development.js';
import { specializationKey } from '../../domain/services/skills/specialization-keys.js';
import { type LanguageRanks, MULTILINGUAL_TRAIT_ID, validateMultilingualRanks } from '../../domain/services/traits/multilingual.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port.js';
import { type ProfessionClientPort, PROFESSION_CLIENT } from '../ports/profession-client.port.js';
import { type RaceClientPort, RACE_CLIENT } from '../ports/race-client.port.js';
import { type SkillCategoryClientPort, SKILL_CATEGORY_CLIENT } from '../ports/skill-category-client.port.js';
import { type SkillClientPort, SKILL_CLIENT } from '../ports/skill-client.port.js';
import { SpecializationCatalogService } from './specialization-catalog.service.js';

const LANGUAGE_CATEGORY = 'language';

/**
 * Skill ranks granted by a talent (workspace spec 076, A7). Today only Multilingual grants them: it checks the
 * distribution and the languages, and creates the language skills the character does not have yet, with the cost of
 * its profession, before the talent is added.
 */
@Injectable()
export class TalentSkillRanksService {
  constructor(
    @Inject(SKILL_CLIENT) private readonly skillClient: SkillClientPort,
    @Inject(SKILL_CATEGORY_CLIENT) private readonly skillCategoryClient: SkillCategoryClientPort,
    @Inject(PROFESSION_CLIENT) private readonly professionClient: ProfessionClientPort,
    @Inject(RACE_CLIENT) private readonly raceClient: RaceClientPort,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly specializationCatalog: SpecializationCatalogService,
  ) {}

  async prepare(character: Character, traitId: string, languageRanks: LanguageRanks[] | undefined): Promise<GrantedSkillRanks[]> {
    if (traitId !== MULTILINGUAL_TRAIT_ID) {
      if (languageRanks?.length) {
        throw new ValidationError(`Trait ${traitId} grants no language ranks`, 'err-multilingual-distribution');
      }
      return [];
    }
    // Spec 050: the languages are keys of the language enumeration of the realm of the game
    const entries = (languageRanks || []).map(entry => ({
      ...entry,
      specialization: specializationKey(LANGUAGE_CATEGORY, entry.specialization) ?? '',
    }));
    validateMultilingualRanks(entries);
    const game = await this.gameRepository.findById(character.gameId);
    await this.specializationCatalog.check(
      entries.map(entry => ({ skillId: entry.skillId, category: LANGUAGE_CATEGORY, specialization: entry.specialization })),
      game?.realmId || null,
    );
    const granted: GrantedSkillRanks[] = [];
    for (const entry of entries) {
      const exists = !!character.findSkill(entry.skillId, entry.specialization);
      if (!exists) await this.createSkill(character, entry.skillId, entry.specialization);
      granted.push({ skillId: entry.skillId, specialization: entry.specialization, ranks: entry.ranks, created: !exists });
    }
    return granted;
  }

  // The same skill AddSkillHandler creates: profession cost, catalog and category stats, racial bonus
  private async createSkill(character: Character, skillId: string, specialization: string): Promise<void> {
    const [profession, skill, race] = await Promise.all([
      this.professionClient.getProfessionById(character.info.professionId),
      this.skillClient.getSkillById(skillId),
      this.raceClient.getRaceById(character.info.race.id),
    ]);
    if (!profession) throw new NotFoundError('Profession', character.info.professionId);
    if (!skill) throw new NotFoundError('Skill', skillId);
    const category = await this.skillCategoryClient.getSkillCategoryById(skill.categoryId);
    if (!category) throw new ValidationError(`Invalid skill category identifier '${skill.categoryId}'`);
    const costKey = developmentCostKey(skillId, skill.categoryId, character.experience.weaponDevelopment);
    const racialBonus =
      race?.skillBonuses?.find(bonus => bonus.skillId === skillId && (bonus.specialization || null) === specialization)?.bonus ?? 0;
    character.addSkill(
      skillId,
      specialization,
      skillStatistics(skill.bonus, category),
      profession.skillCosts[costKey] || [],
      racialBonus,
      skill.categoryId,
    );
  }
}

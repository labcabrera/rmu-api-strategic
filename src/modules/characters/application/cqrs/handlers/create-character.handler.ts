import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { type RaceClientPort, type Race, RACE_CLIENT } from '../../ports/race-client.port.js';
import { CharacterStatCreation, CreateCharacterCommand } from '../commands/create-character.command.js';
import { Character } from '../../../domain/aggregates/character.js';
import { type Profession, type ProfessionClientPort, PROFESSION_CLIENT } from '../../ports/profession-client.port.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../../factions/application/ports/faction-repository.port.js';
import { type SkillClientPort, type SkillResponse, SKILL_CLIENT } from '../../ports/skill-client.port.js';
import { type SkillCategoryClientPort, type SkillCategoryResponse, SKILL_CATEGORY_CLIENT } from '../../ports/skill-category-client.port.js';
import { CharacterStat, STAT_KEYS, type StatKey } from '../../../domain/value-objects/character-stat.vo.js';
import type { CharacterInfo } from '../../../domain/value-objects/character-info.vo.js';
import { characterRealms, type CharacterRealm } from '../../../domain/value-objects/character-realm.vo.js';
import { validateRealms } from '../../../domain/services/realms-rules.js';
import { developmentCostKey, skillStatistics } from '../../../domain/services/skills/skill-development.js';
import { SpellListSkillResolver } from '../../services/spell-list-skill.resolver.js';
import { BadGatewayError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { NamedEntity } from '../../../../shared/domain/entities/named-entity.js';
import { CharacterCreatedEvent } from '../../../domain/events/character.events.js';
import { type TraitClientPort, TRAIT_CLIENT } from '../../ports/trait-client.port.js';
import { mapRaceTraits } from '../../services/race-traits.mapper.js';
import { type Culture, type CultureClientPort, CULTURE_CLIENT } from '../../ports/culture-client.port.js';
import { resolveCultureRanks } from '../../services/culture-ranks.resolver.js';
import type { CultureRanks } from '../../../domain/aggregates/character.js';
import { validateCreationStats, validateStatPoints } from '../../../domain/services/stats/stat-rules.js';
import { resolveOptions } from '../../../../games/domain/value-objects/game-options.vo.js';
import { resolvePowerLevel } from '../../../../games/domain/value-objects/game-power-level.vo.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { isUpstreamHttpError } from '../../../../shared/infrastructure/http/http-client.js';
import { SpecializationCatalogService } from '../../services/specialization-catalog.service.js';
import { specializationKey } from '../../../domain/services/skills/specialization-keys.js';
import type { CreateCharacterSkill } from '../commands/create-character.command.js';

@CommandHandler(CreateCharacterCommand)
export class CreateCharacterHandler implements ICommandHandler<CreateCharacterCommand, Character> {
  private readonly logger = new Logger(CreateCharacterHandler.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(RACE_CLIENT) private readonly raceClient: RaceClientPort,
    @Inject(SKILL_CLIENT) private readonly skillClient: SkillClientPort,
    @Inject(SKILL_CATEGORY_CLIENT) private readonly skillCategoryClient: SkillCategoryClientPort,
    @Inject(PROFESSION_CLIENT) private readonly professionClient: ProfessionClientPort,
    @Inject(TRAIT_CLIENT) private readonly traitClient: TraitClientPort,
    @Inject(CULTURE_CLIENT) private readonly cultureClient: CultureClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterAccess: CharacterAccess,
    private readonly spellListSkillResolver: SpellListSkillResolver,
    private readonly specializationCatalog: SpecializationCatalogService,
  ) {}

  async execute(command: CreateCharacterCommand): Promise<Character> {
    // rmu-user or rmu-admin (F-strategic-15).
    this.characterAccess.checkCreate(command.roles);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new ValidationError(`Game with id ${command.gameId} not found`);

    const faction = await this.factionRepository.findById(command.faction);
    if (!faction) throw new ValidationError(`Faction with id ${command.faction} not found`);

    if (faction.gameId != game.id) {
      throw new ValidationError(`Faction ${command.faction} does not belong to game ${command.gameId}`);
    }

    this.validateStatistics(game, command.statistics);

    const race = await this.fetchRace(command.info.raceId);
    const profession = await this.fetchProfession(command.info.professionId);
    const culture = command.culture ? await this.fetchCulture(command.culture.cultureId) : undefined;
    const catalogSkills = await this.fetchSkills();
    const cultureRanks = culture ? resolveCultureRanks(culture, command.culture!.assignments || [], catalogSkills) : [];
    // Spec 050: the chosen specializations are keys of the catalog of the realm of the game
    const skills = normalizeSkills(command.skills || [], catalogSkills);
    await this.specializationCatalog.check(
      [...skills, ...cultureRanks].map(ref => ({
        skillId: ref.skillId,
        category: catalogSkills.find(skill => skill.id === ref.skillId)?.specialization,
        specialization: ref.specialization,
      })),
      game.realmId || null,
    );

    const processedStatistics = this.processStatistics(race, command.statistics);
    const realms = validateRealms(command.info.realmTypes, profession);
    const info = this.getCharacterInfo(command, race, realms);
    const character = Character.partialCreate(
      game,
      new NamedEntity(faction.id, faction.name),
      command.name,
      info,
      command.roleplay,
      command.level,
      command.weaponDevelopment,
      processedStatistics,
      command.imageUrl,
      command.userId,
      race.baseDevPoints || 0,
    );
    await this.processSkills(character, profession, skills, race, cultureRanks, catalogSkills);
    if (culture) {
      character.applyCulture(culture.id, cultureRanks);
    }
    character.syncRaceTraits(await mapRaceTraits(race.traits, this.traitClient));

    character.updateRace({
      raceName: race.name,
      sizeId: race.sizeId || 'medium',
      stats: race.stats || {},
      resistances: race.resistances || {},
      strideBonus: race.strideBonus || 0,
      enduranceBonus: race.enduranceBonus || 0,
      recoveryMultiplier: race.recoveryMultiplier || 1,
      baseHits: race.baseHits || 0,
      baseAt: race.baseAt || 1,
      skillBonuses: race.skillBonuses || [],
    });
    this.characterProcessorService.process(character, []);
    character.finishCreation();
    const created = await this.characterRepository.save(character);
    await this.events.publish('character', new CharacterCreatedEvent(created.getProps()));
    return character;
  }

  // Temporary not above potential, values in 1..100 and, with point-buy generation, the stat points budget
  private validateStatistics(game: Game, statistics: Record<StatKey, CharacterStatCreation>): void {
    validateCreationStats(statistics || {}, STAT_KEYS);
    if (resolveOptions(game.options).statGeneration === 'point-buy') {
      validateStatPoints(statistics, STAT_KEYS, resolvePowerLevel(game.powerLevel).statPoints);
    }
  }

  processStatistics(raceInfo: Race, statistics: Record<StatKey, CharacterStatCreation>): Record<StatKey, CharacterStat> {
    const result = {} as Record<StatKey, CharacterStat>;
    STAT_KEYS.forEach(e => {
      const potential = statistics[e].potential;
      const temporary = statistics[e].temporary;
      const stat = CharacterStat.fromModifiers(potential, temporary, {} as Record<string, number>);
      result[e] = stat;
    });
    return result;
  }

  async processSkills(
    character: Character,
    profession: Profession,
    commandSkills: CreateCharacterSkill[],
    raceInfo: Race,
    cultureRanks: CultureRanks[] = [],
    catalogSkills?: SkillResponse[],
  ): Promise<void> {
    const skills = [...commandSkills];
    // Always include the 'body-development' skill
    if (!skills.some(e => e.skillId === 'body-development')) {
      skills.push({
        skillId: 'body-development',
        specialization: null,
      });
    }
    raceInfo.skillBonuses?.forEach(bonus => {
      const current = skills.find(
        s => s.skillId === bonus.skillId && (s.specialization === bonus.specialization || bonus.specialization === null),
      );
      if (!current) {
        skills.push({
          skillId: bonus.skillId,
          specialization: bonus.specialization,
        });
      }
    });
    // Culture skills the character does not have yet are created with the profession cost
    cultureRanks.forEach(entry => {
      const current = skills.find(s => s.skillId === entry.skillId && (s.specialization || null) === (entry.specialization || null));
      if (!current) {
        skills.push({ skillId: entry.skillId, specialization: entry.specialization });
      }
    });
    const readedSkills = catalogSkills ?? (await this.fetchSkills());
    const readedSkillCategories = await this.fetchSkillCategories();
    const context = { professionId: profession.id, realms: characterRealms(character.info) };
    for (const skill of skills) {
      // A spell list: the skill follows from the list and the profession (spec 029)
      const skillId = await this.spellListSkillResolver.resolve(skill.skillId, skill.specialization, context);
      const readedSkill = readedSkills.find(s => s.id == skillId);
      if (!readedSkill) {
        throw new ValidationError(`Invalid skill identifier '${skillId}'`);
      }
      const readedCategory = readedSkillCategories.find(c => c.id == readedSkill.categoryId);
      if (!readedCategory) {
        throw new ValidationError(`Invalid skill category identifier '${readedSkill.categoryId}'`);
      }
      const statistics = skillStatistics(readedSkill.bonus, readedCategory);
      const costKey = developmentCostKey(skillId, readedCategory.id, character.experience.weaponDevelopment);
      const devPoints = profession.skillCosts[costKey] || [];
      character.addSkill(skillId, skill.specialization, statistics, devPoints, 0, readedCategory.id);
    }
  }

  private getCharacterInfo(command: CreateCharacterCommand, race: Race, realms: CharacterRealm[]): CharacterInfo {
    return {
      race: new NamedEntity(race.id, race.name),
      professionId: command.info.professionId,
      sizeId: command.info.sizeId,
      realmType: realms[0],
      realmTypes: realms,
      height: command.info.height,
      weight: command.info.weight,
      cultureId: null,
    };
  }

  private async fetchRace(raceId: string): Promise<Race> {
    const race = await notFoundAsUndefined(() => this.raceClient.getRaceById(raceId));
    if (!race) throw new ValidationError(`Race with id ${raceId} not found.`);
    return race;
  }

  private async fetchCulture(cultureId: string): Promise<Culture> {
    const culture = await notFoundAsUndefined(() => this.cultureClient.getCultureById(cultureId));
    if (!culture) throw new ValidationError(`Culture with id ${cultureId} not found.`, 'err-culture-not-found');
    return culture;
  }

  private async fetchSkills(): Promise<SkillResponse[]> {
    try {
      return (await this.skillClient.getAllSkills()).content;
    } catch (e) {
      this.logger.error(e);
      throw new BadGatewayError(`Error fetching skills`);
    }
  }

  private async fetchSkillCategories(): Promise<SkillCategoryResponse[]> {
    try {
      return await this.skillCategoryClient.getAllSkillCategories();
    } catch (e) {
      this.logger.error(e);
      throw new BadGatewayError(`Error fetching skill categories`);
    }
  }

  // An unknown profession is the client's mistake (400); core failing is a 502/504 (F-strategic-12).
  private async fetchProfession(professionId: string): Promise<Profession> {
    const profession = await this.professionClient.getProfessionById(professionId);
    if (!profession) throw new ValidationError(`Profession with id ${professionId} not found.`);
    return profession;
  }
}

/**
 * The entity, or undefined when core answers 404 (the id the user sent does not exist: a 400 for the caller). Any other
 * failure (5xx, no answer, timeout) propagates as the HttpClient maps it, 502 or 504 (F-strategic-26, spec 044
 * decision 5).
 */
async function notFoundAsUndefined<T>(call: () => Promise<T | undefined | null>): Promise<T | undefined> {
  try {
    return (await call()) ?? undefined;
  } catch (error) {
    if (isUpstreamHttpError(error) && error.status === 404) return undefined;
    throw error;
  }
}

/** The skills of the command with their specializations as the character stores them (spec 050). */
function normalizeSkills(skills: CreateCharacterSkill[], catalogSkills: SkillResponse[]): CreateCharacterSkill[] {
  return skills.map(skill => ({
    ...skill,
    specialization: specializationKey(catalogSkills.find(s => s.id === skill.skillId)?.specialization, skill.specialization),
  }));
}

import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { RaceClientPort, Race } from '../../ports/race-client.port';
import { CharacterStatCreation, CreateCharacterCommand } from '../commands/create-character.command';
import { Character } from '../../../domain/aggregates/character.aggregate';
import type { Profession, ProfessionClientPort } from '../../ports/profession-client.port';
import type { CharacterRepository } from '../../ports/character.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import type { FactionRepository } from '../../../../factions/application/ports/faction.repository';
import type { SkillClientPort, SkillResponse } from '../../ports/skill-client.port';
import type { SkillCategoryClientPort, SkillCategoryResponse } from '../../ports/skill-category-client.port';
import { CharacterStat, STAT_KEYS, StatKey } from '../../../domain/value-objects/character-stat.vo';
import { CharacterInfo } from '../../../domain/value-objects/character-info.vo';
import { WeaponDevelopmentType } from '../../../domain/value-objects/weapon-development-type.vo';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { BadGatewayError, ValidationError } from '../../../../shared/domain/errors/errors';
import { NamedEntity } from '../../../../shared/domain/entities/named-entity';
import { CharacterCreatedEvent } from '../../../domain/events/character.events';
import type { TraitClientPort } from '../../ports/trait-client.port';
import { mapRaceTraits } from '../../services/race-traits.mapper';
import type { Culture, CultureClientPort } from '../../ports/culture-client.port';
import { resolveCultureRanks } from '../../services/culture-ranks.resolver';
import type { CultureRanks } from '../../../domain/aggregates/character.aggregate';
import { validateCreationStats, validateStatPoints } from '../../../domain/services/stats/stat-rules';
import { resolveOptions } from '../../../../games/domain/value-objects/game-options.vo';
import { resolvePowerLevel } from '../../../../games/domain/value-objects/game-power-level.vo';
import { Game } from '../../../../games/domain/aggregates/game.aggregate';

@CommandHandler(CreateCharacterCommand)
export class CreateCharacterHandler implements ICommandHandler<CreateCharacterCommand, Character> {
  private readonly logger = new Logger(CreateCharacterHandler.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('RaceClient') private readonly raceClient: RaceClientPort,
    @Inject('SkillClient') private readonly skillClient: SkillClientPort,
    @Inject('SkillCategoryClient') private readonly skillCategoryClient: SkillCategoryClientPort,
    @Inject('ProfessionClient') private readonly professionClient: ProfessionClientPort,
    @Inject('TraitClient') private readonly traitClient: TraitClientPort,
    @Inject('CultureClient') private readonly cultureClient: CultureClientPort,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
    private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async execute(command: CreateCharacterCommand): Promise<Character> {
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

    const processedStatistics = this.processStatistics(race, command.statistics);
    const info = this.getCharacterInfo(command, race);
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
    await this.processSkills(character, profession, command, race, cultureRanks, catalogSkills);
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
    this.characterEventBus.publish(new CharacterCreatedEvent(created.getProps()));
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
    command: CreateCharacterCommand,
    raceInfo: Race,
    cultureRanks: CultureRanks[] = [],
    catalogSkills?: SkillResponse[],
  ): Promise<void> {
    const skills = command.skills || [];
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
    for (const skill of skills) {
      const readedSkill = readedSkills.find(s => s.id == skill.skillId);
      if (!readedSkill) {
        throw new ValidationError(`Invalid skill identifier '${skill.skillId}'`);
      }
      const readedCategory = readedSkillCategories.find(c => c.id == readedSkill.categoryId);
      if (!readedCategory) {
        throw new ValidationError(`Invalid skill category identifier '${readedSkill.categoryId}'`);
      }
      const statistics = readedSkill.bonus.concat(readedCategory ? readedCategory.bonus : []);
      const categoryId = this.getSkillDevelopmentCategory(character, skill.skillId, readedCategory.id);
      const devPoints = profession.skillCosts[categoryId] || [];
      character.addSkill(skill.skillId, skill.specialization, statistics, devPoints, 0);
    }
  }

  private getCharacterInfo(command: CreateCharacterCommand, race: Race): CharacterInfo {
    return {
      race: new NamedEntity(race.id, race.name),
      professionId: command.info.professionId,
      sizeId: command.info.sizeId,
      realmType: command.info.realmType,
      height: command.info.height,
      weight: command.info.weight,
      cultureId: null,
    };
  }

  private getSkillDevelopmentCategory(character: Character, skillId: string, categoryId: string): string {
    const combatType = this.mapCombatSkill(skillId);
    if (combatType) {
      const index = character.experience.weaponDevelopment.indexOf(combatType);
      return `combat${index + 1}`;
    }
    return categoryId;
  }

  private mapCombatSkill(skillId: string): WeaponDevelopmentType | undefined {
    if (skillId.startsWith('melee-weapon')) return 'melee';
    if (skillId.startsWith('ranged-weapon')) return 'ranged';
    if (skillId === 'shield') return 'shield';
    if (skillId === 'unarmed-st' || skillId === 'unarmed-ag') return 'unarmed';
    return undefined;
  }

  private async fetchRace(raceId: string): Promise<Race> {
    try {
      return await this.raceClient.getRaceById(raceId);
    } catch (e) {
      this.logger.error(e);
      throw new ValidationError(`Race with id ${raceId} not found.`);
    }
  }

  private async fetchCulture(cultureId: string): Promise<Culture> {
    try {
      return await this.cultureClient.getCultureById(cultureId);
    } catch (e) {
      this.logger.error(e);
      throw new ValidationError(`Culture with id ${cultureId} not found.`, 'err-culture-not-found');
    }
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

  private async fetchProfession(professionId: string): Promise<Profession> {
    try {
      return await this.professionClient.getProfessionById(professionId);
    } catch (e) {
      this.logger.error(e);
      throw new ValidationError(`Profession with id ${professionId} not found.`);
    }
  }
}

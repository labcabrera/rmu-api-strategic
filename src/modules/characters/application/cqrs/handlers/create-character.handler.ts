/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { RaceClientPort, Race } from '../../ports/race-client.port';
import { CreateCharacterCommand } from '../commands/create-character.command';
import { CharacterItem } from 'src/modules/characters/domain/value-objects/character-item.vo';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';
import type { ItemClientPort } from '../../ports/item-client.port';
import type { Profession, ProfessionClientPort } from '../../ports/profession-client.port';
import type { CharacterRepository } from '../../ports/character.repository';
import type { GameRepository } from 'src/modules/games/application/ports/game.repository';
import type { FactionRepository } from 'src/modules/factions/application/ports/faction.repository';
import type { SkillClientPort, SkillResponse } from '../../ports/skill-client.port';
import type { SkillCategoryClientPort, SkillCategoryResponse } from '../../ports/skill-category-client.port';
import { CharacterStatistics, Stat } from 'src/modules/characters/domain/value-objects/character-statistics.vo';
import { CharacterInfo } from 'src/modules/characters/domain/value-objects/character-info.vo';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { BadGatewayError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { CharacterCreatedEvent } from 'src/modules/characters/domain/events/character.events';

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
    @Inject('ItemClient') private readonly itemClient: ItemClientPort,
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: CreateCharacterCommand): Promise<Character> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new ValidationError(`Game with id ${command.gameId} not found`);

    const faction = await this.factionRepository.findById(command.faction);
    if (!faction) throw new ValidationError(`Faction with id ${command.faction} not found`);

    if (faction.gameId != game.id) {
      throw new ValidationError(`Faction ${command.faction} does not belong to game ${command.gameId}`);
    }

    const race = await this.fetchRace(command.info.raceId);
    const profession = await this.fetchProfession(command.info.professionId);
    const processedStatistics = this.processStatistics(race, command.statistics, game);
    const info: CharacterInfo = {
      race: new NamedEntity(race.id, race.name),
      professionId: command.info.professionId,
      sizeId: command.info.sizeId,
      realmType: command.info.realmType,
      height: command.info.height,
      weight: command.info.weight,
    };
    const items = await this.processItems(info, command);
    const character = Character.partialCreate(
      game,
      new NamedEntity(faction.id, faction.name),
      command.name,
      info,
      command.roleplay,
      command.level,
      command.weaponDevelopment,
      processedStatistics,
      command.userId,
    );
    await this.processSkills(character, profession, command, race);
    character.updateRace({
      raceName: race.name,
      sizeId: race.sizeId || 'medium',
      stats: race.stats || {},
      resistances: race.resistances || {},
      strideBonus: race.strideBonus || 0,
      enduranceBonus: race.enduranceBonus || 0,
      baseHits: race.baseHits || 0,
      baseAt: race.baseAt || 1,
    });
    //TODO move to aggregate logic
    character.items = items;
    this.loadDefaultEquipment(character);
    this.characterProcessorService.process(character);
    character.finishCreation();
    const created = await this.characterRepository.save(character);
    this.characterEventBus.publish(new CharacterCreatedEvent(created.getProps()));
    return created;
  }

  processStatistics(raceInfo: Race, statistics: CharacterStatistics, game: Game): CharacterStatistics {
    const values = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];
    const result: any = {};
    const minStat = game.powerLevel.statRandomMin - 1 || 10;
    const multiplier = 100 - minStat;
    values.forEach((e) => {
      const value: Stat = statistics[e] as Stat;
      let potential = value ? value.potential : undefined;
      let temporary = value ? value.temporary : undefined;
      if (!potential && !temporary) {
        const random: number[] = [];
        // Discard rolls < 10
        random.push(Math.floor(Math.random() * multiplier) + minStat);
        random.push(Math.floor(Math.random() * multiplier) + minStat);
        random.push(Math.floor(Math.random() * multiplier) + minStat);
        random.sort();
        potential = random[2];
        temporary = random[1];
      }
      let racial = 0;
      if (raceInfo && raceInfo.stats && raceInfo.stats[e]) {
        racial = raceInfo.stats[e];
      }
      const bonus = 0;
      let custom = 0;
      if (statistics && value && value.custom) {
        custom = value.custom;
      }
      const total = bonus + racial + custom;
      result[e] = {
        potential: potential,
        temporary: temporary,
        bonus: bonus,
        racial: racial,
        custom: custom,
        totalBonus: total,
      };
    });
    return result;
  }

  async processSkills(character: Character, profession: Profession, command: CreateCharacterCommand, raceInfo: Race): Promise<void> {
    const skills = command.skills || [];
    // Always include the 'body-development' skill
    if (!skills.some((e) => e.skillId === 'body-development')) {
      skills.push({
        skillId: 'body-development',
        specialization: undefined,
      });
    }
    const readedSkills = await this.fetchSkills();
    const readedSkillCategories = await this.fetchSkillCategories();
    for (const skill of skills) {
      const readedSkill = readedSkills.find((s) => s.id == skill.skillId);
      if (!readedSkill) {
        throw new ValidationError(`Invalid skill identifier '${skill.skillId}'`);
      }
      const readedCategory = readedSkillCategories.find((c) => c.id == readedSkill.categoryId);
      if (!readedCategory) {
        throw new ValidationError(`Invalid skill category identifier '${readedSkill.categoryId}'`);
      }
      const statistics = readedSkill.bonus.concat(readedCategory ? readedCategory.bonus : []);
      const categoryId = this.getSkillDevelopmentCategory(character, skill.skillId, readedCategory.id);
      const devPoints = profession.skillCosts[categoryId] || [];
      let racialBonus: number;
      if (skill.skillId === 'body-development') {
        racialBonus = raceInfo.baseHits;
      } else {
        //TODO read from race info
        racialBonus = 0;
      }
      character.addSkill(skill.skillId, skill.specialization, statistics, devPoints, racialBonus);
    }
  }

  private getSkillDevelopmentCategory(character: Character, skillId: string, categoryId: string): string {
    const combatType = this.mapCombatSkill(skillId);
    if (combatType) {
      const index = character.experience.weaponDevelopment.indexOf(combatType);
      return `combat${index + 1}`;
    }
    return categoryId;
  }

  async processItems(characterInfo: CharacterInfo, command: CreateCharacterCommand): Promise<CharacterItem[]> {
    if (!command.items || command.items.length == 0) {
      return [];
    }
    return Promise.all(
      command.items.map(async (e) => {
        const readedItem = await this.itemClient.getItemById(e.itemTypeId);
        const readedWeapon = readedItem.weapon ? readedItem.weapon : undefined;
        const readedArmor = readedItem.armor ? readedItem.armor : undefined;
        const name = e.name || readedItem.id.charAt(0).toUpperCase() + readedItem.id.slice(1);
        const itemInfo = {
          length: readedItem.info.length,
          strength: readedItem.info.strength,
          weight: readedItem.info.weight,
        };
        if (!itemInfo.weight && readedItem.info.weightPercent) {
          itemInfo.weight = readedItem.info.weightPercent * characterInfo.weight;
        }
        return {
          id: randomUUID(),
          name: name,
          itemTypeId: e.itemTypeId,
          category: readedItem.category,
          carried: true,
          weapon: readedWeapon,
          armor: readedArmor,
          affixes: [],
          info: itemInfo,
          stackable: readedItem.stackable,
          amount: undefined,
          description: undefined,
        } as CharacterItem;
      }),
    );
  }

  loadDefaultEquipment(character: Partial<Character>): void {
    if (!character.items || !character.equipment) {
      return;
    }
    const weapon = character.items.find((e) => e.category === 'weapon');
    const shield = character.items.find((e) => e.category === 'shield');
    const armor = character.items.find((e) => e.category === 'armor');
    if (weapon && weapon.id) {
      character.equipment.mainHand = weapon.id;
    }
    if (shield && shield.id) {
      character.equipment.offHand = shield.id;
    }
    if (shield && shield.id) {
      character.equipment.offHand = shield.id;
    }
    if (armor && armor.id) {
      character.equipment.body = armor.id;
    }
  }

  private mapCombatSkill(skillId: string): WeaponDevelopmentType | undefined {
    if (skillId.startsWith('melee-weapon')) return 'melee';
    if (skillId.startsWith('ranged-weapon')) return 'ranged';
    if (skillId === 'shield') return 'shield';
    if (skillId === 'unarmed-combat') return 'unarmed';
    return undefined;
  }

  async fetchRace(raceId: string): Promise<Race> {
    try {
      return await this.raceClient.getRaceById(raceId);
    } catch (e) {
      this.logger.error(e);
      throw new ValidationError(`Race with id ${raceId} not found.`);
    }
  }

  async fetchSkills(): Promise<SkillResponse[]> {
    try {
      return (await this.skillClient.getAllSkills()).content;
    } catch (e) {
      this.logger.error(e);
      throw new BadGatewayError(`Error fetching skills`);
    }
  }

  async fetchSkillCategories(): Promise<SkillCategoryResponse[]> {
    try {
      return await this.skillCategoryClient.getAllSkillCategories();
    } catch (e) {
      this.logger.error(e);
      throw new BadGatewayError(`Error fetching skill categories`);
    }
  }

  async fetchItem(itemId: string): Promise<any> {
    try {
      return await this.itemClient.getItemById(itemId);
    } catch (e) {
      this.logger.error(e);
      throw new ValidationError(`Item with id ${itemId} not found.`);
    }
  }

  async fetchProfession(professionId: string): Promise<Profession> {
    try {
      return await this.professionClient.getProfessionById(professionId);
    } catch (e) {
      this.logger.error(e);
      throw new ValidationError(`Profession with id ${professionId} not found.`);
    }
  }
}

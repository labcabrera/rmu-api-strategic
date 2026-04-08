import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { AddSkillCommand } from '../commands/add-skill.command';
import type { CharacterRepository } from '../../ports/character.repository';
import type { SkillCategoryClientPort } from '../../ports/skill-category-client.port';
import type { SkillClientPort, SkillResponse } from '../../ports/skill-client.port';
import type { ProfessionClientPort } from '../../ports/profession-client.port';
import type { RaceClientPort } from '../../ports/race-client.port';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(AddSkillCommand)
export class AddSkillHandler implements ICommandHandler<AddSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('SkillClient') private readonly skillClient: SkillClientPort,
    @Inject('ProfessionClient') private readonly professionClient: ProfessionClientPort,
    @Inject('SkillCategoryClient') private readonly skillCategoryClient: SkillCategoryClientPort,
    @Inject('RaceClient') private readonly raceClient: RaceClientPort,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const specialization = command.specialization;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    if (this.hasSkillId(character, skillId, specialization))
      throw new ValidationError(`Skill ${skillId} already exists for character ${characterId}`);

    if (command.ranks > 0 && !command.roles.includes('admin')) {
      throw new ValidationError(`Only admin users can add skills with ranks greater than 0`);
    }

    const [readedSkill, readedProfession, readedRace] = await Promise.all([
      this.skillClient.getSkillById(skillId),
      this.professionClient.getProfessionById(character.info.professionId),
      this.raceClient.getRaceById(character.info.race.id),
    ]);

    if (!readedSkill) throw new NotFoundError('Skill', skillId);
    if (!readedProfession) throw new NotFoundError('Profession', character.info.professionId);
    if (!readedRace) throw new NotFoundError('Race', character.info.race.id);

    this.validateSpecialization(readedSkill, specialization);

    const readedCategory = await this.skillCategoryClient.getSkillCategoryById(readedSkill.categoryId);
    if (!readedCategory) throw new ValidationError(`Invalid skill category identifier '${readedSkill.categoryId}'`);

    const categoryId = this.getSkillDevelopmentCategory(character, skillId, readedSkill.categoryId);
    const devPoints = readedProfession.skillCosts[categoryId] || [];
    const statistics = readedSkill.bonus.concat(readedCategory ? readedCategory.bonus : []);
    //TODO add to core model
    //const racialBonus = readedRace.skillBonuses?.[skillId] || 0;
    const racialBonus = 0;
    character.addSkill(command.skillId, command.specialization, statistics, devPoints, racialBonus);

    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character.id, character);
    character.getUncommittedEvents().forEach((event) => this.characterEventBus.publish(event));
    return updated;
  }

  private hasSkillId(character: Character, skillId: string, specialization: string | null): boolean {
    return character.skills.some((skill) => skill.skillId === skillId && skill.specialization === specialization);
  }

  private getSkillDevelopmentCategory(character: Character, skillId: string, categoryId: string): string {
    const combatType = this.mapCombatSkill(skillId);
    if (combatType) {
      const index = character.experience.weaponDevelopment.indexOf(combatType);
      return `combat${index + 1}`;
    }
    return categoryId;
  }

  private validateSpecialization(skill: SkillResponse, specialization: string | null): void {
    if (skill.specialization) {
      if (!specialization) {
        throw new ValidationError(`Skill ${skill.id} requires a specialization`);
      }
    } else if (specialization) {
      throw new ValidationError(`Skill ${skill.id} does not allow specialization`);
    }
  }

  private mapCombatSkill(skillId: string): WeaponDevelopmentType | undefined {
    if (skillId.startsWith('melee-weapon')) return 'melee';
    if (skillId.startsWith('ranged-weapon')) return 'ranged';
    if (skillId === 'shield') return 'shield';
    if (skillId === 'unarmed-combat') return 'unarmed';
    return undefined;
  }
}

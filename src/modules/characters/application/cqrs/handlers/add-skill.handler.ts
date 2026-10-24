import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { AddSkillCommand } from '../commands/add-skill.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type SkillCategoryClientPort, SKILL_CATEGORY_CLIENT } from '../../ports/skill-category-client.port.js';
import { type SkillClientPort, type SkillResponse, SKILL_CLIENT } from '../../ports/skill-client.port.js';
import { type ProfessionClientPort, PROFESSION_CLIENT } from '../../ports/profession-client.port.js';
import { type RaceClientPort, RACE_CLIENT } from '../../ports/race-client.port.js';
import type { WeaponDevelopmentType } from '../../../domain/value-objects/weapon-development-type.vo.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddSkillCommand)
export class AddSkillHandler implements ICommandHandler<AddSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(SKILL_CLIENT) private readonly skillClient: SkillClientPort,
    @Inject(PROFESSION_CLIENT) private readonly professionClient: ProfessionClientPort,
    @Inject(SKILL_CATEGORY_CLIENT) private readonly skillCategoryClient: SkillCategoryClientPort,
    @Inject(RACE_CLIENT) private readonly raceClient: RaceClientPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const specialization = command.specialization;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    if (character.findSkill(skillId, specialization)) {
      throw new ValidationError(`Skill ${skillId} with specialization ${specialization} already exists for character ${characterId}`);
    }

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
    let racialBonus = 0;
    if (readedRace.skillBonuses) {
      const skillBonus = readedRace.skillBonuses.find(
        bonus => bonus.skillId === skillId && (bonus.specialization === specialization || (!bonus.specialization && !specialization)),
      );
      if (skillBonus) {
        racialBonus = skillBonus.bonus;
      }
    }
    character.addSkill(command.skillId, command.specialization, statistics, devPoints, racialBonus);

    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character);
    await this.events.publishChanges('character', character);
    return updated;
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
    if (skillId === 'unarmed-st' || skillId === 'unarmed-ag') return 'unarmed';
    return undefined;
  }
}

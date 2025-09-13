import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/character.repository';
import * as skillCategoryClient from '../../ports/skill-category-client.port';
import * as skillClient from '../../ports/skill-client.port';
import { AddSkillCommand } from '../commands/add-skill.command';
import { CharacterSkill } from 'src/modules/characters/domain/value-objects/character-skill.vo';

@CommandHandler(AddSkillCommand)
export class AddSkillHandler implements ICommandHandler<AddSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('SkillClient') private readonly skillClient: skillClient.SkillClientPort,
    @Inject('SkillCategoryClient') private readonly skillCategoryClient: skillCategoryClient.SkillCategoryClientPort,
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    if (this.hasSkillId(character, skillId)) {
      throw new ValidationError(`Skill ${skillId} already exists for character ${characterId}`);
    }
    const skillInfo = await this.skillClient.getSkillById(skillId);
    const skillCategoryInfo = await this.skillCategoryClient.getSkillCategoryById(skillInfo.categoryId);
    if (skillInfo.specializations && skillInfo.specializations.length > 0) {
      if (!command.specialization || command.specialization.trim().length === 0) {
        throw new ValidationError(`Specialization is required for skill ${skillId}`);
      }
    } else {
      if (command.specialization && command.specialization.trim().length > 0) {
        throw new ValidationError(`Specialization is not allowed for skill ${skillId}`);
      }
    }

    const statistics = [...skillCategoryInfo.bonus, ...skillInfo.bonus];
    //TODO read from profession
    const development = [1, 2];
    //TODO read from api
    const racialBonus: number = 0;
    const skill = new CharacterSkill(
      command.skillId,
      command.specialization,
      statistics,
      development,
      [], // professional
      0, // ranks
      0, // ranks developed this level
      0, // statBonus
      racialBonus,
      0,
      0,
      0,
      0,
    );
    character.skills.push(skill);
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(character);
    return updated;
  }

  private hasSkillId(character: Character, skillId: string): boolean {
    return character.skills.some((skill) => skill.skillId === skillId);
  }
}

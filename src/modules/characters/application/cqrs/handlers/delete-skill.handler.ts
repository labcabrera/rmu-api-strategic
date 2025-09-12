import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { DeleteSkillCommand } from '../commands/delete-skill-command';
import { CharacterLevelCalculator } from 'src/modules/characters/domain/services/character-level-calculator';
import type { CharacterLevelDevRepository } from '../../ports/character-level-dev.repository';
import type { CharacterRepository } from '../../ports/character.repository';

//TODO only can remove skills added in the current level
@CommandHandler(DeleteSkillCommand)
export class DeleteSkillHandler implements ICommandHandler<DeleteSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('CharacterLevelDevRepository') private readonly characterLevelRepository: CharacterLevelDevRepository,
  ) {}

  async execute(command: DeleteSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const skill = character.skills.find((skill) => skill.skillId === skillId) || null;
    if (!skill) {
      throw new ValidationError(`Skill ${skillId} not found for character ${characterId}`);
    }
    if (skill.ranks > 0) {
      const cld = await this.characterLevelRepository.findByCharacterAndLevel(characterId, character.experience.level);
      if (!cld) {
        throw new ValidationError(`Character level data not found for character ${characterId}`);
      }
      const devSkills = (cld.skills?.get(command.skillId) as number[]) || [];
      if (skill.ranks > devSkills.length) {
        throw new ValidationError(`Skill ${skillId} cannot be removed from character ${characterId}`);
      }
      cld.skills?.delete(command.skillId);
      await this.characterLevelRepository.update(cld.id, cld);
      const used = CharacterLevelCalculator.calculateUsedDevPoints(cld);
      character.experience.availableDevelopmentPoints = character.experience.developmentPoints - used;
    }
    character.skills = character.skills.filter((skill) => skill.skillId !== skillId);
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(character);
    return updated;
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { UpdateSkillCommand } from '../commands/update-skill.command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(UpdateSkillCommand)
export class UpdateSkillHandler implements ICommandHandler<UpdateSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: UpdateSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const skill = character.skills.find((skill) => skill.skillId === skillId) || null;
    if (!skill) throw new ValidationError(`Skill ${skillId} not found for character ${characterId}`);

    if (command.customBonus !== undefined) {
      skill.customBonus = command.customBonus;
    }
    skill.ranks = command.ranks || skill.ranks;
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(character);
    return updated;
  }
}

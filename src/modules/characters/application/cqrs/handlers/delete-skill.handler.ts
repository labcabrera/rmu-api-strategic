import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { DeleteSkillCommand } from '../commands/delete-skill-command';
import type { CharacterRepository } from '../../ports/character.repository';

//TODO only can remove skills added in the current level
@CommandHandler(DeleteSkillCommand)
export class DeleteSkillHandler implements ICommandHandler<DeleteSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(command: DeleteSkillCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    character.deleteSkill(command.skillId, command.specialization);
    this.characterProcessorService.process(character);
    const updated = await this.characterRepository.update(character);
    //TODO propagate events
    return updated;
  }
}

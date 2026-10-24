import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { LevelDownSkillCommand } from '../commands/level-down-skill.command';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port';

@CommandHandler(LevelDownSkillCommand)
export class LevelDownSkillHandler implements ICommandHandler<LevelDownSkillCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: LevelDownSkillCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    character.levelDownSkill(command.skillId, command.specialization);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character.id, character);
    //TODO propagate events
    return updated;
  }
}

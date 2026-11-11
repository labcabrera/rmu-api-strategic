import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { CharacterWriter } from '../../services/character-writer.service.js';
import { RecalculateCharacterCommand } from '../commands/recalculate-character.command.js';

/**
 * Workspace spec 077, decision B1.7: loads a character and its items, runs the processor and stores the result. For the
 * migrations that change what the processor derives (load, Iron Will, Increased Size). Only an admin. A sheet that
 * does not change is neither written nor published.
 */
@CommandHandler(RecalculateCharacterCommand)
export class RecalculateCharacterHandler implements ICommandHandler<RecalculateCharacterCommand, Character> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterWriter: CharacterWriter,
  ) {}

  async execute(command: RecalculateCharacterCommand): Promise<Character> {
    if (!GameAccess.isAdmin(command.roles)) throw new ForbiddenError('Only an admin recalculates a character');
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', command.characterId);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    return this.characterWriter.save(character);
  }
}

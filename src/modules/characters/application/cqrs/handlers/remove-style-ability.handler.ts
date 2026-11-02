import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { removeStyleAbility } from '../../../domain/services/fighting-styles/style-allocation.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { CharacterWriter } from '../../services/character-writer.service.js';
import { RemoveStyleAbilityCommand } from '../commands/remove-style-ability.command.js';

/** Undoes a selection of a fighting style ability: the selections are permanent, so only the game master or an admin. */
@CommandHandler(RemoveStyleAbilityCommand)
export class RemoveStyleAbilityHandler implements ICommandHandler<RemoveStyleAbilityCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly characterWriter: CharacterWriter,
  ) {}

  async execute(command: RemoveStyleAbilityCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', command.characterId);
    await this.characterAccess.checkManage(character, command.userId, command.roles);

    removeStyleAbility(character, command.skillId, command.specialization, command.abilityId);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    return this.characterWriter.save(character);
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { allocateStyleAbility } from '../../../domain/services/fighting-styles/style-allocation.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type FightingStylesClientPort, FIGHTING_STYLES_CLIENT } from '../../ports/fighting-styles-client.port.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { CharacterWriter } from '../../services/character-writer.service.js';
import { AddStyleAbilityCommand } from '../commands/add-style-ability.command.js';

/** Allocates free ranks of a fighting style to one of its abilities (workspace spec 032). */
@CommandHandler(AddStyleAbilityCommand)
export class AddStyleAbilityHandler implements ICommandHandler<AddStyleAbilityCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(FIGHTING_STYLES_CLIENT) private readonly fightingStylesClient: FightingStylesClientPort,
    private readonly characterAccess: CharacterAccess,
    private readonly characterWriter: CharacterWriter,
  ) {}

  async execute(command: AddStyleAbilityCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', command.characterId);
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const catalog = await this.fightingStylesClient.getFightingStyles();
    allocateStyleAbility(character, command.skillId, command.specialization, command.abilityId, catalog);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    return this.characterWriter.save(character);
  }
}

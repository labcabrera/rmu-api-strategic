import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import type { CharacterRepository } from '../../ports/character.repository';
import type { TraitClientPort } from '../../ports/trait-client.port';
import { DeleteTraitCommand } from '../commands/delete-trait.command';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(DeleteTraitCommand)
export class DeleteTraitHandler implements ICommandHandler<DeleteTraitCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('TraitClient') private readonly traitClient: TraitClientPort,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: DeleteTraitCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    character.deleteTrait(command.traitId, command.specialization);
    const items = await this.itemRepository.findByCharacterId(character.id);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character.id, character);
    character.getUncommittedEvents().forEach(event => this.characterEventBus.publish(event));
    return updated;
  }
}

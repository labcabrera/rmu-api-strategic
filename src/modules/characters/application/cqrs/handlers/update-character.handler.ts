import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { UpdateCharacterCommand } from '../commands/update-character.command';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(UpdateCharacterCommand)
export class UpdateCharacterHandler implements ICommandHandler<UpdateCharacterCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: UpdateCharacterCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    character.update({
      name: command.name,
      weight: command.info?.weight,
      height: command.info?.height,
      age: command.roleplay?.age,
      gender: command.roleplay?.gender,
      description: command.description,
      imageUrl: command.imageUrl,
    });
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    const updated = await this.characterRepository.update(character.id, character);
    await this.events.publishChanges('character', character);
    return updated;
  }
}

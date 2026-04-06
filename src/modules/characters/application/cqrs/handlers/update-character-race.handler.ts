import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import type { CharacterRepository } from '../../ports/character.repository';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { UpdateCharacterRaceCommand } from '../commands/update-character-race.command';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';

@CommandHandler(UpdateCharacterRaceCommand)
export class UpdateCharacterRaceHandler implements ICommandHandler<UpdateCharacterRaceCommand, void> {
  private readonly logger = new Logger(UpdateCharacterRaceHandler.name);

  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: UpdateCharacterRaceCommand): Promise<void> {
    this.logger.log(`Executing UpdateCharacterRaceCommand for characterId: ${command.characterId}`);
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    character.updateRace({
      raceName: command.name,
      sizeId: command.sizeId,
      stats: command.stats,
      resistances: command.resistances,
      strideBonus: command.strideBonus,
      enduranceBonus: command.enduranceBonus,
      baseHits: command.baseHits,
      baseAt: command.baseAt,
    });
    const items = await this.itemRepository.findByCharacterId(characterId);
    this.characterProcessorService.process(character, items);
    await this.characterRepository.update(character.id, character);
    character.getUncommittedEvents().forEach((event) => this.characterEventBus.publish(event));
  }
}

import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { TransferGoldCommand } from '../commands/transfer-gold.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../../factions/application/ports/faction-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { Item } from '../../../../items/domain/aggregates/item.js';
import { CreateItemCommand } from '../../../../items/application/cqrs/commands/create-item.command.js';

const GOLD_COIN = 'gold-coin';

@CommandHandler(TransferGoldCommand)
export class TransferGoldHandler implements ICommandHandler<TransferGoldCommand, Character> {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: TransferGoldCommand): Promise<Character> {
    if (command.amount === 0) throw new ValidationError(`Gold amount cannot be zero`);

    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const faction = await this.factionRepository.findById(character.faction.id);
    if (!faction) throw new NotFoundError('Faction', character.faction.id);

    const goldCoinItem = await this.getOrCreateGoldCoinItem(character);
    const goldCoins = goldCoinItem ? goldCoinItem.amount || 0 : 0;

    if (command.amount < 0 && goldCoins < command.amount) throw new ValidationError(`Insufficient gold coins: ${goldCoins}`);

    goldCoinItem.amount = (goldCoinItem.amount || 0) + command.amount;
    faction.management.availableGold -= command.amount;

    if (goldCoinItem.amount < 0) throw new ValidationError(`Gold coin amount cannot be negative: ${goldCoinItem.amount}`);
    if (faction.management.availableGold < 0)
      throw new ValidationError(`Faction's available gold cannot be negative: ${faction.management.availableGold}`);

    await this.itemRepository.update(goldCoinItem);
    await this.factionRepository.update(faction);

    return character;
  }

  private async getOrCreateGoldCoinItem(character: Character): Promise<Item> {
    const current: Item | null = await this.itemRepository.findByCharacterIdAndItemTypeId(character.id, GOLD_COIN);
    if (current) {
      return current;
    }
    const createItemCommand = new CreateItemCommand(
      character.gameId,
      null,
      character.id,
      GOLD_COIN,
      'Gold coins',
      true,
      null,
      0,
      null,
      null,
      null,
      character.id,
      ['rmu-admin'],
    );
    return await this.commandBus.execute(createItemCommand);
  }
}

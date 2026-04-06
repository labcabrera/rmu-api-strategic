import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { TransferGoldCommand } from '../commands/transfer-gold.command';
import type { CharacterRepository } from '../../ports/character.repository';
import type { FactionRepository } from 'src/modules/factions/application/ports/faction.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { CreateItemCommand } from 'src/modules/items/application/cqrs/commands/create-item.command';

const GOLD_COIN = 'gold-coin';

@CommandHandler(TransferGoldCommand)
export class TransferGoldHandler implements ICommandHandler<TransferGoldCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject() private readonly commandBus: CommandBus,
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

    await this.itemRepository.update(goldCoinItem.id, goldCoinItem);
    await this.factionRepository.update(faction.id, faction);

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
      null,
      0,
      null,
      null,
      character.id,
      ['rmu-admin'],
    );
    return await this.commandBus.execute(createItemCommand);
  }
}

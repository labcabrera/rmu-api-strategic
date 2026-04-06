import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { TransferGoldCommand } from '../commands/transfer-gold.command';
import type { CharacterRepository } from '../../ports/character.repository';
import type { FactionRepository } from 'src/modules/factions/application/ports/faction.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';

const GOLD_COIN = 'gold-coin';

@CommandHandler(TransferGoldCommand)
export class TransferGoldHandler implements ICommandHandler<TransferGoldCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
  ) {}

  async execute(command: TransferGoldCommand): Promise<Character> {
    if (command.amount === 0) throw new ValidationError(`Gold amount cannot be zero`);

    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const faction = await this.factionRepository.findById(character.faction.id);
    if (!faction) throw new NotFoundError('Faction', character.faction.id);

    faction.management.availableGold -= command.amount;

    throw new Error('Not implemented');

    // const goldCoinItem: Item | null = this.itemRepository
    //   .findByRsql(`characterId==${character.id};itemTypeId==${GOLD_COIN}`, 0, 10)
    //   .then((page) => page.content)
    //   .then((items) => (items.length > 0 ? items[0] : null));
    // const goldCoins = goldCoinItem ? goldCoinItem.amount || 0 : 0;

    // if (command.amount < 0) {
    //   if (!goldCoins) {
    //     throw new NotFoundError('Gold coins', character.id);
    //   }
    //   if (goldCoins < command.amount) {
    //     throw new ValidationError(`Insufficient gold coins: ${goldCoins}`);
    //   }
    // }
    // if (goldCoins) {
    // if (!goldCoins) {
    //   goldCoinItem!.amount = 0;
    // }
    // goldCoins += command.amount;
    // } else {
    // const goldCoins = {
    //   id: randomUUID(),
    //   name: 'Gold coins',
    //   itemTypeId: 'gold-coin',
    //   category: 'coins',
    //   carried: true,
    //   info: {
    //     weight: 0,
    //   },
    //   stackable: true,
    //   amount: command.amount,
    // } as CharacterItem;
    // character.items.push(goldCoins);
    // }

    // if (faction.management.availableGold < 0) {
    //   throw new ValidationError(`Insuficient faction gold`);
    // }
    // if (goldCoins!.amount! < 0) {
    //   throw new ValidationError(`Insuficient character gold amount`);
    // }

    // this.characterProcessorService.process(character);
    // const updated = await this.characterRepository.update(character.id, character);
    // await this.factionRepository.update(faction.id, faction);
    // return updated;
  }
}

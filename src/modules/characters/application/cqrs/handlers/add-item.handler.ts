import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { AddItemCommand } from '../commands/add-item.comand';
import { CharacterItem } from 'src/modules/characters/domain/value-objects/character-item.vo';
import type { ItemClientPort, ItemResponse } from '../../ports/item-client.port';
import type { CharacterRepository } from '../../ports/character.repository';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';

@CommandHandler(AddItemCommand)
export class AddItemHandler implements ICommandHandler<AddItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemClient') private readonly itemClient: ItemClientPort,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const readedItem = await this.itemClient.getItemById(command.itemTypeId);
    if (command.amount && command.amount < 1) {
      throw new ValidationError(`Amount must be greater than 0`);
    }
    if (command.amount && command.amount > 1 && !readedItem.stackable) {
      throw new ValidationError(`Item ${readedItem.id} is not stackable, amount must be 1 or undefined`);
    }
    const cost = this.getCost(readedItem, command);
    const amount = command.amount || 1;
    const totalCost = cost ? cost * amount : 0;
    if (cost) {
      const goldItem = character.items.find((i) => i.itemTypeId === 'gold-coin');
      if (goldItem!.amount! < totalCost) {
        throw new ValidationError(
          `Character does not have enough gold to purchase the item. Cost: ${totalCost}, Available: ${goldItem!.amount}`,
        );
      }
      goldItem!.amount! -= totalCost;
    }
    const item = this.buildItem(readedItem, command, character.info.weight);
    character.addItem(item);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(character);
  }

  private getWeight(item: CharacterItem): number {
    return item.info.weight;
  }

  private getCost(readedItem: ItemResponse, command: AddItemCommand): number | undefined {
    if (command.cost) {
      return command.cost;
    }
    return readedItem.info.cost?.average || undefined;
  }

  private buildItem(readedItem: ItemResponse, command: AddItemCommand, characterWeight: number): CharacterItem {
    let weight = readedItem.info.weight || 0;
    if (readedItem.info.weightPercent) {
      weight = (characterWeight * readedItem.info.weightPercent) / 100;
    }
    return {
      id: randomUUID(),
      name: command.name || command.itemTypeId,
      itemTypeId: command.itemTypeId,
      category: readedItem.category,
      carried: true,
      weapon: readedItem.weapon,
      armor: readedItem.armor,
      affixes: [],
      info: {
        length: readedItem.info.length,
        strength: command.strength || readedItem.info.strength,
        weight: command.weight || weight || 0,
      },
      description: '',
      stackable: readedItem.stackable,
      amount: command.amount || undefined,
    };
  }
}

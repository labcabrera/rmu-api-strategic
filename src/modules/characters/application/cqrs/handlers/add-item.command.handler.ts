import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/character.repository';
import * as itemClient from '../../ports/item-client.port';
import { AddItemCommand } from '../commands/add-item.comand';
import { CharacterItem } from 'src/modules/characters/domain/value-objects/character-item.vo';
import { ItemResponse } from '../../ports/item-client.port';

@CommandHandler(AddItemCommand)
export class AddItemCommandHandler implements ICommandHandler<AddItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('ItemClient') private readonly itemClient: itemClient.ItemClientPort,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const readedItem = await this.itemClient.getItemById(command.itemTypeId);
    const cost = this.getCost(readedItem, command);
    if (cost) {
      const goldItem = character.items.find((i) => i.itemTypeId === 'gold-coin');
      if (goldItem!.amount! < cost) {
        throw new ValidationError(
          `Character does not have enough gold to purchase the item. Cost: ${cost}, Available: ${goldItem!.amount}`,
        );
      }
      goldItem!.amount! -= cost;
    }

    let weight = readedItem.info.weight ? readedItem.info.weight : 0;
    if (readedItem.info.weightPercent) {
      weight = (character.info.weight * readedItem.info.weightPercent) / 100;
    }
    const info = {
      length: readedItem.info.length,
      strength: readedItem.info.strength,
      weight: weight,
      productionTime: -100,
    };
    const item: CharacterItem = {
      id: randomUUID(),
      name: command.name || command.itemTypeId,
      itemTypeId: command.itemTypeId,
      category: readedItem.category,
      carried: true,
      weapon: readedItem.weapon,
      weaponRange: readedItem.weaponRange,
      armor: readedItem.armor,
      affixes: [],
      info: info,
      description: '',
      stackable: false,
      amount: undefined,
    };
    character.items.push(item);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }

  getWeight(item: CharacterItem): number {
    return item.info.weight;
  }

  getCost(readedItem: ItemResponse, command: AddItemCommand): number | undefined {
    if (command.cost) {
      return command.cost;
    }
    return readedItem.info.cost?.average || undefined;
  }
}

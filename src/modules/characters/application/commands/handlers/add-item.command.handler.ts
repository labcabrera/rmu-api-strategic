import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import * as itemClient from '../../ports/out/item-client';
import { AddItemCommand } from '../add-item.comand';
import { CharacterItem } from 'src/modules/characters/domain/entities/character-item.entity';

@CommandHandler(AddItemCommand)
export class AddItemCommandHandler implements ICommandHandler<AddItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('ItemClient') private readonly itemClient: itemClient.ItemClient,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const readedItem = await this.itemClient.getItemById(command.itemTypeId);
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
}

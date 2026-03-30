import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { AddItemCommand } from '../commands/add-item.comand';
import { CharacterItem } from 'src/modules/characters/domain/value-objects/character-item.vo';
import type { ItemClientPort, ItemResponse } from '../../ports/item-client.port';
import type { CharacterRepository } from '../../ports/character.repository';
import type { CharacterEventBusPort } from '../../ports/character-event-bus.port';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import { AddFactionGoldCommand } from 'src/modules/factions/application/cqrs/commands/add-faction-gold.command';

@CommandHandler(AddItemCommand)
export class AddItemHandler implements ICommandHandler<AddItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemClient') private readonly itemClient: ItemClientPort,
    @Inject('CharacterEventBus') private readonly characterEventBus: CharacterEventBusPort,
    @Inject() private commandBus: CommandBus,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const readedItem = await this.itemClient.getItemById(command.itemTypeId);
    if (command.amount && command.amount < 1) throw new ValidationError(`Amount must be greater than 0`);

    if (command.amount && command.amount > 1 && readedItem.info.stackable !== true) {
      throw new ValidationError(`Item ${readedItem.id} is not stackable, amount must be 1 or undefined`);
    }

    const cost = this.getCost(readedItem, command);
    const amount = command.amount || 1;
    const totalCost = Math.round((cost ? cost * amount : 0) * 1e3) / 1e3;
    if (cost) {
      const goldItem = character.items.find((i) => i.itemTypeId === 'gold-coin');
      let characterCost = 0;
      let factionCost = 0;

      if (goldItem) {
        const characterAvailableGold = goldItem.amount || 0;
        const diff = Math.round((characterAvailableGold - totalCost) * 1e3) / 1e3;
        if (diff < 0) {
          // Character does not have enough gold, need to take from faction
          characterCost = characterAvailableGold;
          factionCost = totalCost - characterAvailableGold;
        }
      } else {
        characterCost = totalCost;
      }
      if (factionCost > 0) {
        try {
          const cmd = new AddFactionGoldCommand(character.faction.id, -factionCost, command.userId, command.roles);
          await this.commandBus.execute(cmd);
        } catch {
          throw new ValidationError(`Character's faction does not have enough gold`);
        }
      }
      if (characterCost > 0) {
        goldItem!.amount = Math.round((goldItem!.amount! - characterCost) * 1e3) / 1e3;
      }
    }

    const item = this.buildItem(readedItem, command, character.info.weight);
    character.addItem(item);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(character.id, character);
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
      stackable: readedItem.info.stackable,
      amount: command.amount || undefined,
    };
  }
}

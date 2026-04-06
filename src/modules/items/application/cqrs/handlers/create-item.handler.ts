import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateItemCommand } from '../commands/create-item.command';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import type { ItemRepository } from '../../ports/item.repository';
import type { ItemEventBusPort } from '../../ports/item-event-bus.port';
import type { ItemGuardPort } from '../../ports/item-guard.port';
import type { ItemClientPort } from 'src/modules/items/application/ports/item-client.port';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { FactionRepository } from 'src/modules/factions/application/ports/faction.repository';
import type { CharacterRepository } from 'src/modules/characters/application/ports/character.repository';
import { ItemProps } from 'src/modules/items/domain/aggregates/item-props';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';

@CommandHandler(CreateItemCommand)
export class CreateItemHandler implements ICommandHandler<CreateItemCommand, Item> {
  private readonly logger = new Logger(CreateItemHandler.name);

  constructor(
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemEventProducer') private readonly itemEventBus: ItemEventBusPort,
    @Inject('ItemGuardPort') private readonly itemGuard: ItemGuardPort,
    @Inject('ItemClientPort') private readonly itemClientPort: ItemClientPort,
  ) {}

  async execute(command: CreateItemCommand): Promise<Item> {
    this.itemGuard.checkCreate(command.roles);

    const itemType = await this.itemClientPort.getItemById(command.itemTypeId);
    if (!itemType) throw new ValidationError(`Invalid item type ${command.itemTypeId}`);

    let faction: Faction | null = null;
    let character: Character | null = null;

    let weight = itemType.info.weight || 0;
    const unitaryCost = command.cost || itemType.info.cost?.average || 0;
    const totalCost = Math.round(unitaryCost * (command.amount || 1) * 1000) / 1000; // round to 3 decimals

    const characterGoldItem = await this.itemRepository.findByCharacterIdAndItemTypeId(command.characterId, 'gold-coin');
    let factionCost = 0;
    let characterCost = 0;

    //TODO check if faction/character can afford the item and update their gold
    console.warn(`TODO check if faction/character can afford the item and update their gold. Cost: ${totalCost}`);

    if (command.factionId) {
      if (command.characterId) throw new ValidationError(`Cannot specify both factionId and characterId`);
      faction = await this.factionRepository.findById(command.factionId);
      if (!faction) throw new ValidationError(`Invalid faction ${command.factionId}`);
      if (totalCost > faction.management.availableGold) {
        throw new ValidationError(`Faction cannot afford the item. Required: ${totalCost}, Available: ${faction.management.availableGold}`);
      }
      factionCost = totalCost;
    }

    if (command.characterId) {
      if (command.factionId) throw new ValidationError(`Cannot specify both factionId and characterId`);
      character = await this.characterRepository.findById(command.characterId);
      if (!character) throw new ValidationError(`Invalid character ${command.characterId}`);
      if (itemType.armor && itemType.armor.enc) {
        weight = (itemType.armor.enc * character.info.weight) / 100;
        weight = Math.round(weight * 100) / 100; // round to 2 decimals
      }
      let characterAvailableGold = 0;
      if (characterGoldItem) {
        characterAvailableGold = characterAvailableGold = characterGoldItem.amount || 0;
      }
      characterCost = Math.min(totalCost, characterAvailableGold);
      factionCost = characterCost - characterAvailableGold;
    }

    if (faction && factionCost > 0) {
      //TODO use command
      faction.addGold(-factionCost);
      await this.factionRepository.update(faction.id, faction);
    }

    if (command.amount) {
      //TODO update faction/character gold and check if they have enough
    }

    const itemProps: Omit<ItemProps, 'id' | 'createdAt' | 'updatedAt'> = {
      gameId: command.gameId,
      factionId: command.factionId,
      characterId: command.characterId,
      itemTypeId: command.itemTypeId,
      name: command.name || itemType.id,
      category: itemType.category,
      carried: command.carried || false,
      weapon: itemType.weapon,
      armor: itemType.armor,
      affixes: command.affixes || [],
      amount: command.amount,
      info: {
        length: itemType.info.length,
        weight: weight,
        strength: itemType.info.strength,
        stackable: itemType.info.stackable || false,
      },
      description: command.description,
      accessType: 'public', //TODO
      owner: command.userId,
    };

    const item = Item.create(itemProps);
    const savedItem = await this.itemRepository.save(item);
    item.getUncommittedEvents().forEach((event) => this.itemEventBus.publish(event));
    return savedItem;
  }
}

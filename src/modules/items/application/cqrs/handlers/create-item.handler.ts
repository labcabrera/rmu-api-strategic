import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateItemCommand } from '../commands/create-item.command';
import { Item } from '../../../domain/aggregates/item.aggregate';
import type { ItemRepository } from '../../ports/item.repository';
import type { ItemEventBusPort } from '../../ports/item-event-bus.port';
import type { ItemGuardPort } from '../../ports/item-guard.port';
import type { ItemClientPort, ItemResponse } from '../../ports/item-client.port';
import { ValidationError } from '../../../../shared/domain/errors/errors';
import type { FactionRepository } from '../../../../factions/application/ports/faction.repository';
import type { CharacterRepository } from '../../../../characters/application/ports/character.repository';
import { ItemProps } from '../../../domain/aggregates/item-props';
import { Faction } from '../../../../factions/domain/aggregates/faction.aggregate';
import { Character } from '../../../../characters/domain/aggregates/character.aggregate';
import { ItemWeapon } from '../../../domain/value-objects/item-weapon.vo';

const goldCoin = 'gold-coin';

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
    this.validateCommand(command);
    this.itemGuard.checkCreate(command.roles);

    let faction: Faction | null = null;
    let character: Character | null = null;
    let characterGoldItem: Item | null = null;
    let factionCost = 0;
    let characterCost = 0;

    const itemType = await this.readItemType(command.itemTypeId);
    const totalCost = this.getTotalCost(command, itemType);

    // Add item to faction
    if (command.factionId) {
      faction = await this.readFaction(command.factionId);
      if (totalCost > faction.management.availableGold) {
        throw new ValidationError(`Faction cannot afford the item. Required: ${totalCost}, Available: ${faction.management.availableGold}`);
      }
      factionCost = totalCost;
    }

    // Add item to character
    if (command.characterId) {
      character = await this.readCharacter(command.characterId);
      faction = await this.readFaction(character.faction.id);

      characterGoldItem = await this.itemRepository.findByCharacterIdAndItemTypeId(command.characterId, goldCoin);
      const characterAvailableGold = characterGoldItem ? characterGoldItem.amount || 0 : 0;
      characterCost = Math.min(totalCost, characterAvailableGold);
      factionCost = totalCost - characterCost;
    }

    if (faction && factionCost !== 0) {
      faction.addGold(-factionCost);
      await this.factionRepository.update(faction.id, faction);
    }

    if (character && characterGoldItem && characterCost !== 0) {
      const characterGoldItem = await this.itemRepository.findByCharacterIdAndItemTypeId(command.characterId, goldCoin);
      if (characterGoldItem) {
        characterGoldItem.addAmount(-characterCost);
        await this.itemRepository.update(characterGoldItem.id, characterGoldItem);
      }
    }

    const item = this.createOrUpdateItem(command, itemType, character);
    //item.getUncommittedEvents().forEach((event) => this.itemEventBus.publish(event));
    return item;
  }

  private validateCommand(command: CreateItemCommand): void {
    if (command.factionId && command.characterId) {
      throw new ValidationError(`Cannot specify both factionId and characterId`);
    } else if (!command.factionId && !command.characterId) {
      throw new ValidationError(`Either factionId or characterId must be specified`);
    }
    if (!command.itemTypeId) {
      throw new ValidationError(`itemTypeId is required`);
    }
  }

  private getTotalCost(command: CreateItemCommand, itemType: ItemResponse): number {
    const unitaryCost = command.cost || itemType.info.cost?.average || 0;
    return Math.round(unitaryCost * (command.amount || 1) * 1000) / 1000; // round to 3 decimals
  }

  private async createOrUpdateItem(command: CreateItemCommand, itemType: ItemResponse, character: Character | null): Promise<Item> {
    let weight = itemType.info.weight || 0;
    if (character && itemType.armor && itemType.armor.enc) {
      weight = (itemType.armor.enc * character.info.weight) / 100;
      weight = Math.round(weight * 100) / 100;
    }

    let existingItem: Item | null = null;
    if (character && itemType.info.stackable === true) {
      existingItem = await this.itemRepository.findByCharacterIdAndItemTypeId(character.id, command.itemTypeId);
    }

    if (existingItem) {
      existingItem.addAmount(command.amount || 1);
      return await this.itemRepository.update(existingItem.id, existingItem);
    } else {
      const itemProps: Omit<ItemProps, 'id' | 'createdAt' | 'updatedAt'> = {
        gameId: command.gameId,
        factionId: command.factionId,
        characterId: command.characterId,
        itemTypeId: command.itemTypeId,
        name: command.name || itemType.id,
        category: itemType.category,
        carried: command.carried || false,
        weapon: this.getWeapon(command, itemType),
        armor: itemType.armor,
        shield: itemType.shield,
        modifiers: [],
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
      return await this.itemRepository.save(item);
    }
  }

  private getWeapon(command: CreateItemCommand, itemType: ItemResponse): ItemWeapon | null {
    if (!itemType.weapon) {
      if (command.wielderSize) throw new ValidationError(`wielderSize can only be set on weapons`);
      return null;
    }
    const { skillId, fumble, modes } = itemType.weapon;
    return new ItemWeapon(skillId, fumble, modes, command.wielderSize || itemType.weapon.wielderSize);
  }

  private async readItemType(itemTypeId: string): Promise<ItemResponse> {
    const itemType = await this.itemClientPort.getItemById(itemTypeId);
    if (!itemType) throw new ValidationError(`Invalid item type ${itemTypeId}`);
    return itemType;
  }

  private async readFaction(factionId: string): Promise<Faction> {
    const faction = await this.factionRepository.findById(factionId);
    if (!faction) throw new ValidationError(`Invalid faction ${factionId}`);
    return faction;
  }

  private async readCharacter(characterId: string): Promise<Character> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) throw new ValidationError(`Invalid character ${characterId}`);
    return character;
  }
}

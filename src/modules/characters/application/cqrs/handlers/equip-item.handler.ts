import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { EquipItemCommand } from '../commands/equip-item-command';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';
import { CharacterEquipment } from 'src/modules/characters/domain/value-objects/character-equipment.vo';

@CommandHandler(EquipItemCommand)
export class EquipItemHandler implements ICommandHandler<EquipItemCommand, Character> {
  private readonly logger = new Logger(EquipItemHandler.name);

  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    this.logger.debug(`Equipping item ${command.itemId} to character ${command.characterId} in slot ${command.slot}`);
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const items = await this.itemRepository.findByCharacterId(character.id);
    const item = items.find(i => i.id === command.itemId);
    if (!item) throw new ValidationError('Character does not have the specified item in inventory');

    this.validateEquipmentData(character, item, command);
    this.equip(character, items, command);
    this.characterProcessorService.process(character, items);

    await this.itemRepository.updateCarriedStatus(item.id, true);

    return await this.characterRepository.update(character.id, character);
  }

  private equip(character: Character, items: Item[], command: EquipItemCommand): void {
    if (!character.equipment) {
      character.equipment = CharacterEquipment.empty();
    }
    if (!character.equipment.slots) {
      character.equipment.slots = {} as Record<string, string>;
    }
    for (const [slot, equippedItemId] of Object.entries(character.equipment.slots)) {
      if (equippedItemId === command.itemId) {
        character.equipment.slots[slot] = null;
      }
    }
    const item = items.find(i => i.id === command.itemId)!;
    if (item.weapon) {
      if (this.isTwoHanded(item)) {
        character.equipment.slots['offHand'] = null;
      }
      if (command.slot === 'offHand') {
        const mainHandItem = items.find(i => i.id === character.equipment.slots['mainHand']);
        if (mainHandItem && this.isTwoHanded(mainHandItem)) {
          character.equipment.slots['mainHand'] = null;
        }
      }
    }
    if (item.category === 'shield') {
      const mainHandItem = items.find(i => i.id === character.equipment.slots['mainHand']);
      if (mainHandItem && this.isTwoHanded(mainHandItem)) {
        character.equipment.slots['mainHand'] = null;
      }
    }
    character.equipment.slots[command.slot] = command.itemId;
  }

  private isTwoHanded(item: Item): boolean {
    if (!item.weapon || !item.weapon.modes) return false;
    const filtered = item.weapon.modes.filter(m => m.type !== 'two-hands');
    return filtered.length === 0;
  }

  private validateEquipmentData(character: Character, item: Item, command: EquipItemCommand): void {
    switch (command.slot) {
      case 'mainHand':
      case 'offHand':
        if (item.category === 'armor') {
          throw new ValidationError('Can not equip armor types in main hand or off-hand');
        }
        break;
      case 'body':
      case 'head':
      case 'arms':
      case 'legs':
        if (item.category !== 'armor') {
          throw new ValidationError('Required armor type for the requested slot');
        }
        break;
      default:
        throw new ValidationError('Invalid item slot');
    }
    if (command.slot === 'offHand' && item.category !== 'shield') {
      const check1h = item.weapon!.modes.filter(m => m.type !== 'one-hand').length > 0;
      if (check1h) {
        throw new ValidationError('Item is not suitable for off-hand slot');
      }
    }
  }
}

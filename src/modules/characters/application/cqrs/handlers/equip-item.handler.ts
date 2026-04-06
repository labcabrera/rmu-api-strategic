import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import { EquipItemCommand } from '../commands/equip-item-command';
import { CharacterEquipment } from 'src/modules/characters/domain/value-objects/character-equipment.vo';
import type { CharacterRepository } from '../../ports/character.repository';
import { NotFoundError, ValidationError } from 'src/modules/shared/domain/errors/errors';
import type { ItemRepository } from 'src/modules/items/application/ports/item.repository';
import { Item } from 'src/modules/items/domain/aggregates/item.aggregate';

@CommandHandler(EquipItemCommand)
export class EquipItemHandler implements ICommandHandler<EquipItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('ItemRepository') private readonly itemRepository: ItemRepository,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);

    const item = await this.itemRepository.findById(command.itemId);
    if (!item) throw new NotFoundError('Item', command.itemId);

    this.validateEquipmentData(character, item, command);
    this.equip(character, item, command);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(character.id, character);
  }

  private equip(character: Character, item: Item, command: EquipItemCommand): void {
    item.carried = true;
    const slot = command.slot;
    const equipment: CharacterEquipment = character.equipment;

    equipment.mainHand = equipment.mainHand === command.itemId ? undefined : equipment.mainHand;
    equipment.offHand = equipment.offHand === command.itemId ? undefined : equipment.offHand;

    if (command.slot === 'mainHand' && item.weapon!.modes.filter((m) => m.type !== 'one-hand').length > 0) {
      equipment.offHand = undefined;
    } else if (command.slot === 'offHand' && character.equipment.mainHand) {
      //TODO
      // const mainHandWeapon = character.items.find((i) => i.id === equipment.mainHand)!;
      // if (mainHandWeapon.weapon!.modes.filter((m) => m.type !== 'one-hand').length > 0) {
      //   equipment.mainHand = undefined;
      // }
    }

    // Set armor type if equipping body armor
    if (slot === 'body' && item.armor && item.armor.at) {
      character.defense.armor.bodyAt = item.armor.at;
    } else if (slot === 'head' && item.armor && item.armor.at) {
      character.defense.armor.headAt = item.armor.at;
    } else if (slot === 'arms' && item.armor && item.armor.at) {
      character.defense.armor.armsAt = item.armor.at;
    } else if (slot === 'legs' && item.armor && item.armor.at) {
      character.defense.armor.legsAt = item.armor.at;
    }

    // Equip item to specified slot
    if (slot === 'mainHand') {
      equipment.mainHand = command.itemId;
    } else if (slot === 'offHand') {
      equipment.offHand = command.itemId;
    } else if (slot === 'body') {
      equipment.body = command.itemId;
    } else if (slot === 'head') {
      equipment.head = command.itemId;
    } else if (slot === 'arms') {
      equipment.arms = command.itemId;
    } else if (slot === 'legs') {
      equipment.legs = command.itemId;
    }
  }

  private validateEquipmentData(character: Character, item: Item, command: EquipItemCommand): void {
    if (command.slot) {
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
        const check1h = item.weapon!.modes.filter((m) => m.type !== 'one-hand').length > 0;
        if (check1h) {
          throw new ValidationError('Item is not suitable for off-hand slot');
        }
      }
    }
  }
}

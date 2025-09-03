import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CharacterItem } from 'src/modules/characters/domain/entities/character-item.entity';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character, CharacterEquipment } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as cr from '../../ports/out/character.repository';
import { EquipItemCommand } from '../equip-item-command';

@CommandHandler(EquipItemCommand)
export class EquipItemCommandHandler implements ICommandHandler<EquipItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    const item: CharacterItem = character.items.find((e) => e.id === command.itemId) as CharacterItem;
    if (!item) {
      throw new ValidationError(`Item not found: ${command.itemId}`);
    }
    this.validateEquipmentData(character, item, command);
    this.equip(character, item, command);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(command.characterId, character);
  }

  private equip(character: Character, item: CharacterItem, command: EquipItemCommand): void {
    item.carried = true;
    const slot = command.slot;
    const equipment: CharacterEquipment = character.equipment;

    equipment.mainHand = equipment.mainHand === command.itemId ? undefined : equipment.mainHand;
    equipment.offHand = equipment.offHand === command.itemId ? undefined : equipment.offHand;

    if (command.slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
      equipment.offHand = undefined;
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

    // Handle two-handed weapon in main hand
    if (slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
      equipment.offHand = undefined;
    }
    // Set default armor type when no body armor is equipped
    // if (!equipment.body) {
    //   //TODO check racial armor type
    //   character.defense.armorType = 1;
    // }
  }

  private validateEquipmentData(character: Character, item: CharacterItem, command: EquipItemCommand): void {
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
      if (command.slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
        throw new ValidationError('Two handed weapons cant be equiped in offHand slot');
      }
    }
  }
}

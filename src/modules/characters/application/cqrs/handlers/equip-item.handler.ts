import { CharacterWriter } from '../../services/character-writer.service.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import type { EquipmentSlot } from '../../../domain/value-objects/character-equipment.vo.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Character } from '../../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { EquipItemCommand } from '../commands/equip-item.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { Item } from '../../../../items/domain/aggregates/item.js';
import { CharacterEquipment } from '../../../domain/value-objects/character-equipment.vo.js';

@CommandHandler(EquipItemCommand)
export class EquipItemHandler implements ICommandHandler<EquipItemCommand, Character> {
  private readonly logger = new Logger(EquipItemHandler.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterAccess: CharacterAccess,
    private readonly characterWriter: CharacterWriter,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    this.logger.debug(`Equipping item ${command.itemId} to character ${command.characterId} in slot ${command.slot}`);
    const characterId = command.characterId;

    const character = await this.characterRepository.findById(command.characterId);
    if (!character) throw new NotFoundError('Character', characterId);
    // Its owner, the owner of its game or an admin (F-strategic-15).
    await this.characterAccess.checkChange(character, command.userId, command.roles);

    const items = await this.itemRepository.findByCharacterId(character.id);
    const item = items.find(i => i.id === command.itemId);
    if (!item) throw new ValidationError('Character does not have the specified item in inventory');

    this.validateEquipmentData(character, item, command);
    this.equip(character, items, command);
    this.characterProcessorService.process(character, items);

    await this.itemRepository.updateCarriedStatus(item.id, true);

    return await this.characterWriter.save(character);
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
        character.equipment.slots[slot as EquipmentSlot] = null;
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
    // Spec 023, decision 5: a broken item is repaired first (one already in a slot stays there)
    const condition = item.getCondition();
    if (condition.broken || condition.unrepairable) {
      throw new ValidationError('A broken item cannot be equipped', 'err-item-broken');
    }
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

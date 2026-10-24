import { IsNotEmpty, IsString } from 'class-validator';
import { EquipItemCommand } from '../../../application/cqrs/commands/equip-item.command';
import type { EquipmentSlot } from '../../../domain/value-objects/character-equipment.vo';

export class EquipItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  slot: EquipmentSlot;

  static toCommand(characterId: string, dto: EquipItemDto, userId: string, userRoles: string[]) {
    return new EquipItemCommand(characterId, dto.itemId, dto.slot, userId, userRoles);
  }
}

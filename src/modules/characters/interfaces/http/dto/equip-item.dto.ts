import { IsNotEmpty, IsString } from 'class-validator';
import { EquipItemCommand } from 'src/modules/characters/application/cqrs/commands/equip-item-command';

export class EquipItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  slot: string;

  static toCommand(characterId: string, dto: EquipItemDto, userId: string, userRoles: string[]) {
    return new EquipItemCommand(characterId, dto.itemId, dto.slot, userId, userRoles);
  }
}

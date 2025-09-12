import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AddItemCommand } from 'src/modules/characters/application/cqrs/commands/add-item.comand';

export class AddItemDto {
  @ApiProperty({ description: 'Item name', example: 'Ork dagger' })
  @IsString()
  @IsOptional()
  name: string | undefined;

  @ApiProperty({ description: 'Item type identifier', example: 'dagger' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  @ApiProperty({ description: 'Item cost', example: 42 })
  @IsNumber()
  @IsOptional()
  cost: number | undefined;

  static toCommand(characterId: string, dto: AddItemDto, userId: string, roles: string[]): AddItemCommand {
    return new AddItemCommand(characterId, dto.name, dto.itemTypeId, dto.cost, userId, roles);
  }
}

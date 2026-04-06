import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateItemCommand } from 'src/modules/items/application/cqrs/commands/create-item.command';

export class CreateItemDto {
  @ApiProperty({ description: 'Game identifier', example: 'game-001', required: true })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Faction identifier', example: 'faction-001', required: false })
  @IsString()
  @IsOptional()
  factionId: string | null;

  @ApiProperty({ description: 'Realm identifier from core module', example: 'character-001', required: false })
  @IsString()
  @IsOptional()
  characterId: string;

  @ApiProperty({ description: 'Item type identifier', example: 'item-type-001', required: true })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  @ApiProperty({ description: 'Item name', example: 'Narsil', required: false })
  @IsString()
  @IsOptional()
  name: string | null;

  @ApiProperty({ description: 'Amount of items (for stackable items)', example: '10', required: false })
  @IsNumber()
  @IsOptional()
  amount: number | null;

  @ApiProperty({
    description: 'Item cost in gold coints. If item is stackable cost is for each single item',
    example: '0.42',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  cost: number | null;

  @ApiProperty({ description: 'Game short description', example: 'Short game description' })
  @IsString()
  @IsOptional()
  description: string | null;

  static toCommand(dto: CreateItemDto, userId: string, roles: string[]): CreateItemCommand {
    return new CreateItemCommand(
      dto.gameId,
      dto.factionId,
      dto.characterId,
      dto.itemTypeId,
      dto.name,
      null, // carried is not provided in the DTO, defaulting to null
      null, // affixes are not provided in the DTO, defaulting to null
      null, // info is not provided in the DTO, defaulting to null
      dto.amount,
      dto.description,
      dto.cost,
      userId,
      roles,
    );
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { UpdateItemCommand } from '../../../application/cqrs/commands/update-item.command.js';
import { WEAPON_WIELDER_SIZES } from '../../../domain/value-objects/item-weapon.vo.js';

export class UpdateItemDto {
  @ApiProperty({ type: String, description: 'Item name', example: 'Narsil', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name: string | undefined;

  @ApiProperty({
    type: String,
    description: 'Size the weapon is made for (weapons only). When missing, the wielder size is assumed',
    example: 'medium',
    required: false,
    enum: WEAPON_WIELDER_SIZES,
  })
  @IsIn(WEAPON_WIELDER_SIZES)
  @IsOptional()
  wielderSize: string | undefined;

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(itemId: string, dto: UpdateItemDto, userId: string, roles: string[]): UpdateItemCommand {
    return new UpdateItemCommand(itemId, dto.name, dto.wielderSize, userId, roles, dto.version);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { UpdateTemporaryStatCommand } from 'src/modules/characters/application/cqrs/commands/update-temporary-stat.command';
import type { StatKey } from 'src/modules/characters/domain/value-objects/character-stat.vo';

export class UpdateTemporaryStatDto {
  @ApiProperty({ description: 'Stat to update', example: 'ag', required: true })
  @IsString()
  stat: string;

  @ApiProperty({ description: 'Stat update roll', example: 3, required: true })
  @IsNumber()
  roll: number;

  static toCommand(characterId: string, dto: UpdateTemporaryStatDto, userId: string, roles: string[]) {
    return new UpdateTemporaryStatCommand(characterId, dto.stat as StatKey, dto.roll, userId, roles);
  }
}

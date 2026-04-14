import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Max, Min } from 'class-validator';
import { UpdateTemporaryStatCommand } from 'src/modules/characters/application/cqrs/commands/update-temporary-stat.command';
import { STAT_KEYS, type StatKey } from 'src/modules/characters/domain/value-objects/character-stat.vo';

export class UpdateTemporaryStatDto {
  @ApiProperty({ description: 'Stat to update', example: 'ag', required: true, type: String, enum: STAT_KEYS })
  @IsString()
  @IsIn(STAT_KEYS, { message: 'Invalid stat key' })
  stat: StatKey;

  @ApiProperty({ description: 'Stat update roll', example: 3, required: true, minimum: 0, maximum: 10 })
  @IsNumber()
  @Min(0, { message: 'Roll must be at least 0' })
  @Max(10, { message: 'Roll must be at most 10' })
  roll: number;

  static toCommand(characterId: string, dto: UpdateTemporaryStatDto, userId: string, roles: string[]) {
    return new UpdateTemporaryStatCommand(characterId, dto.stat, dto.roll, userId, roles);
  }
}

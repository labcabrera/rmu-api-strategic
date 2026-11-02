import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toStrictBoolean } from '../../../../shared/interfaces/http/dto/strict-boolean.js';

export class LevelUpQueryDto {
  @ApiPropertyOptional({
    description: 'Forces leveling up even if the character has unused development points',
    example: false,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(toStrictBoolean)
  force: boolean | undefined;
}

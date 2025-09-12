import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class LevelUpQueryDto {
  @ApiPropertyOptional({
    description: 'Forces leveling up even if the character has unused development points',
    example: false,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  force: boolean | undefined;
}

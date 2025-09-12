import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class LevelUpQueryDto {
  @ApiPropertyOptional({
    description: 'Forces leveling up even if the character has unused development points',
    example: 'true',
    type: String,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  force: boolean | undefined;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class InjuryRollDto {
  @ApiProperty({ description: 'Unmodified open-ended roll', example: 84 })
  @IsInt()
  roll: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { Stat } from 'src/modules/characters/domain/value-objects/character-statistics.vo';

export class StatDto {
  potential: number | undefined;
  temporary: number | undefined;
  bonus: number | undefined;
  racial: number;
  custom: number;
  totalBonus: number;

  static fromEntity(stat?: Stat | null): StatDto {
    const dto = new StatDto();
    if (!stat) {
      dto.potential = undefined;
      dto.temporary = undefined;
      dto.bonus = 0;
      dto.racial = 0;
      dto.custom = 0;
      dto.totalBonus = 0;
      return dto;
    }

    dto.potential = stat.potential;
    dto.temporary = stat.temporary;
    dto.bonus = stat.bonus || 0;
    dto.racial = stat.racial ?? 0;
    dto.custom = stat.custom ?? 0;
    dto.totalBonus = stat.totalBonus ?? 0;
    return dto;
  }
}

export class StatCreationDto {
  @ApiProperty({ description: 'Potential stat value', example: 90 })
  @IsNumber()
  @IsOptional()
  potential: number;

  @ApiProperty({ description: 'Temporary stat value', example: 90 })
  @IsNumber()
  @IsOptional()
  temporary: number;

  @ApiProperty({ description: 'Custom stat bonus', example: 90 })
  @IsNumber()
  @IsOptional()
  custom: number | undefined;

  toEntity(): Stat {
    return {
      potential: this.potential,
      temporary: this.temporary,
      bonus: 0,
      racial: 0,
      custom: this.custom || 0,
      totalBonus: 0,
    };
  }
}

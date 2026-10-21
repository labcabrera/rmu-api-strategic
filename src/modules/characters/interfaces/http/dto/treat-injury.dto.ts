import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TreatInjuryCommand } from 'src/modules/characters/application/cqrs/commands/treat-injury.command';
import { HEALING_TYPES, TREATMENT_PROCEDURES } from 'src/modules/characters/domain/value-objects/injury.vo';
import type { HealingType, TreatmentProcedure } from 'src/modules/characters/domain/value-objects/injury.vo';

export class ExternalHealerDto {
  @ApiProperty({ example: 'Village healer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Medicine bonus', example: 45 })
  @IsInt()
  bonus: number;

  @ApiPropertyOptional({ description: 'Herbalism bonus', example: 30 })
  @IsInt()
  @IsOptional()
  herbalismBonus?: number;
}

export class HerbalismRollDto {
  @ApiProperty({ description: 'Unmodified Herbalism roll', example: 72 })
  @IsInt()
  roll: number;

  @ApiPropertyOptional({ description: 'Character of the game that rolls Herbalism (the healer by default)' })
  @IsString()
  @IsOptional()
  healerCharacterId?: string;

  @ApiPropertyOptional({ description: 'Herbalism bonus (overrides the character one)', example: 30 })
  @IsInt()
  @IsOptional()
  bonus?: number;
}

export class TreatInjuryDto {
  @ApiProperty({ enum: TREATMENT_PROCEDURES, example: 'splint' })
  @IsIn(TREATMENT_PROCEDURES)
  procedure: TreatmentProcedure;

  @ApiPropertyOptional({ description: 'Healer character of the same strategic game (the patient itself is allowed)' })
  @IsString()
  @IsOptional()
  healerCharacterId?: string;

  @ApiPropertyOptional({ type: ExternalHealerDto, description: 'External healer, when there is no healer character' })
  @ValidateNested()
  @Type(() => ExternalHealerDto)
  @IsOptional()
  healer?: ExternalHealerDto;

  @ApiPropertyOptional({ description: 'Unmodified Medicine roll (not needed for magic)', example: 84 })
  @IsInt()
  @IsOptional()
  roll?: number;

  @ApiPropertyOptional({ description: 'Difficulty modifier', example: 0 })
  @IsInt()
  @IsOptional()
  difficulty?: number;

  @ApiPropertyOptional({ type: HerbalismRollDto, description: 'Herbalism roll: a success adds a bonus to the Medicine roll' })
  @ValidateNested()
  @Type(() => HerbalismRollDto)
  @IsOptional()
  herbalism?: HerbalismRollDto;

  @ApiPropertyOptional({ enum: HEALING_TYPES, description: 'Overrides the type of healing derived from the result' })
  @IsIn(HEALING_TYPES)
  @IsOptional()
  healingType?: HealingType;

  static toCommand(characterId: string, injuryId: string, dto: TreatInjuryDto, userId: string, roles: string[]): TreatInjuryCommand {
    return new TreatInjuryCommand(
      characterId,
      injuryId,
      dto.procedure,
      dto.healerCharacterId,
      dto.healer ? { name: dto.healer.name, bonus: dto.healer.bonus, herbalismBonus: dto.healer.herbalismBonus } : undefined,
      dto.roll,
      dto.difficulty,
      dto.herbalism
        ? { roll: dto.herbalism.roll, healerCharacterId: dto.herbalism.healerCharacterId, bonus: dto.herbalism.bonus }
        : undefined,
      dto.healingType,
      userId,
      roles,
    );
  }
}

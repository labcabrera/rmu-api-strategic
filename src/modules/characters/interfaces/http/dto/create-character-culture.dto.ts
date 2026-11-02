import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import type { CreateCharacterCulture } from '../../../application/cqrs/commands/create-character.command.js';

export class CreateCharacterCultureAssignmentDto {
  @ApiProperty({ description: 'Index of the entry in culture.skillRanks', example: 2 })
  @IsInt()
  @Min(0)
  entry: number;

  @ApiProperty({ description: 'Skill identifier', example: 'language-spoken' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ description: 'Specialization (language, region...) when the skill requires one', required: false, example: 'common' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ description: 'Ranks assigned to the skill from this entry', example: 2 })
  @IsInt()
  @Min(1)
  ranks: number;
}

export class CreateCharacterCultureDto {
  @ApiProperty({ description: 'Culture identifier', example: 'urban' })
  @IsString()
  @IsNotEmpty()
  cultureId: string;

  @ApiProperty({
    description: "Ranks the player assigns to the entries that need a choice ('skill' entries are applied automatically)",
    type: [CreateCharacterCultureAssignmentDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCharacterCultureAssignmentDto)
  assignments?: CreateCharacterCultureAssignmentDto[];

  static toCommand(dto: CreateCharacterCultureDto | undefined): CreateCharacterCulture | undefined {
    if (!dto) return undefined;
    return {
      cultureId: dto.cultureId,
      assignments: (dto.assignments || []).map(a => ({
        entry: a.entry,
        skillId: a.skillId,
        specialization: a.specialization ?? null,
        ranks: a.ranks,
      })),
    };
  }
}

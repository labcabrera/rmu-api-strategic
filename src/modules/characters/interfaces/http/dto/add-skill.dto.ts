import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AddSkillCommand } from 'src/modules/characters/application/cqrs/commands/add-skill.command';

export class AddSkillDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ description: 'Skill specialization', example: 'cats' })
  @IsString()
  @IsOptional()
  specialization: string | null;

  @ApiProperty({ description: 'Skill ranks', example: 1 })
  @IsNumber()
  ranks: number;

  static toCommand(characterId: string, dto: AddSkillDto, userId: string, roles: string[]) {
    return new AddSkillCommand(characterId, dto.skillId, dto.specialization, dto.ranks, userId, roles);
  }
}

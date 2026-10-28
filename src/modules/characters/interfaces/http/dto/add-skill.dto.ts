import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { AddSkillCommand } from '../../../application/cqrs/commands/add-skill.command.js';

export class AddSkillDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ type: String, description: 'Skill specialization', example: 'cats' })
  @IsString()
  @IsOptional()
  specialization: string | null;

  @ApiProperty({ description: 'Initial skill ranks: only an admin can send more than 0', example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  ranks: number;

  static toCommand(characterId: string, dto: AddSkillDto, userId: string, roles: string[]) {
    return new AddSkillCommand(characterId, dto.skillId, dto.specialization, dto.ranks, userId, roles);
  }
}

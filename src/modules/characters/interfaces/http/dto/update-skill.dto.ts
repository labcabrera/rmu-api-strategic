import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { UpdateSkillCommand } from 'src/modules/characters/application/cqrs/commands/update-skill.command';

export class UpdateSkillDto {
  @ApiProperty({ description: 'The number of ranks in the skill', example: 3 })
  @IsNumber()
  ranks: number;

  static toCommand(characterId: string, skillId: string, dto: UpdateSkillDto, userId: string, roles: string[]) {
    return new UpdateSkillCommand(characterId, skillId, dto.ranks, userId, roles);
  }
}

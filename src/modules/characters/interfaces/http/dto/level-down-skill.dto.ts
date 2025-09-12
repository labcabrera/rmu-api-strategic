import { IsNumber, IsOptional } from 'class-validator';
import { LevelDownSkillCommand } from 'src/modules/characters/application/cqrs/commands/level-down-skill.command';

export class LevelDownSkillDto {
  @IsNumber()
  @IsOptional()
  specialization: string | undefined;

  static toCommand(
    characterId: string,
    skillId: string,
    dto: LevelDownSkillDto,
    user: string,
    roles: string[],
  ): LevelDownSkillCommand {
    return new LevelDownSkillCommand(characterId, skillId, dto.specialization, user, roles);
  }
}

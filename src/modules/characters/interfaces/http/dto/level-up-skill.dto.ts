import { IsNumber, IsOptional } from 'class-validator';
import { LevelUpSkillCommand } from 'src/modules/characters/application/cqrs/commands/level-up-skill.command';

export class LevelUpSkillDto {
  @IsNumber()
  @IsOptional()
  specialization: string | undefined;

  static toCommand(
    characterId: string,
    skillId: string,
    dto: LevelUpSkillDto,
    user: string,
    roles: string[],
  ): LevelUpSkillCommand {
    return new LevelUpSkillCommand(characterId, skillId, dto.specialization, user, roles);
  }
}

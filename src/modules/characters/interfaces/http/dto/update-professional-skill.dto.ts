import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import { SetUpProfessionalSkillCommand } from '../../../application/cqrs/commands/setup-professional-skill.command.js';
import type { ProfessionalBonusType } from '../../../domain/value-objects/professional-bonus-type.vo.js';

export class UpdateProfessionalSkillDto {
  @ApiProperty({
    description: 'Professional bonus types',
    example: ['professional'],
    required: true,
    isArray: true,
    type: String,
    enum: ['professional', 'knack'],
  })
  @IsArray()
  @IsIn(['professional', 'knack'], { each: true })
  types: ProfessionalBonusType[];

  static toCommand(
    characterId: string,
    skillId: string,
    specialization: string | null,
    dto: UpdateProfessionalSkillDto,
    userId: string,
    roles: string[],
  ) {
    return new SetUpProfessionalSkillCommand(characterId, skillId, specialization, dto.types || [], userId, roles);
  }
}

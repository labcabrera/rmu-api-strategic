import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AddStyleAbilityCommand } from '../../../application/cqrs/commands/add-style-ability.command.js';

export class AddStyleAbilityDto {
  @ApiProperty({ description: 'Fighting style: the specialization of the skill', example: 'fencing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specialization: string;

  @ApiProperty({ description: 'Ability of the style', example: 'off-hand-dagger' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  abilityId: string;

  static toCommand(id: string, skillId: string, dto: AddStyleAbilityDto, userId: string, roles: string[]): AddStyleAbilityCommand {
    return new AddStyleAbilityCommand(id, skillId, dto.specialization, dto.abilityId, userId, roles);
  }
}

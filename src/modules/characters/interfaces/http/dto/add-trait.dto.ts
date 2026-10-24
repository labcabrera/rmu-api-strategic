import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AddTraitCommand } from '../../../application/cqrs/commands/add-trait.command.js';

export class AddTraitDto {
  @ApiProperty({ description: 'Trait identifier', example: 'prodigy' })
  @IsString()
  @IsNotEmpty()
  traitId: string;

  @ApiProperty({ type: Number, description: 'Trait tier', example: 2 })
  @IsNumber()
  @IsOptional()
  tier: number | undefined;

  @ApiProperty({ type: String, description: 'Trait value', example: 'body-development' })
  @IsString()
  @IsOptional()
  specialization: string | undefined;

  static toCommand(characterId: string, dto: AddTraitDto, userId: string, roles: string[]): AddTraitCommand {
    return new AddTraitCommand(characterId, dto.traitId, dto.tier, dto.specialization, userId, roles);
  }
}

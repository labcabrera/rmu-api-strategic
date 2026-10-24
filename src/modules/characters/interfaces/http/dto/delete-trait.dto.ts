import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeleteTraitCommand } from '../../../application/cqrs/commands/delete-trait.command.js';

export class DeleteTraitDto {
  @ApiProperty({ description: 'Trait identifier', example: 'prodigy' })
  @IsString()
  @IsNotEmpty()
  traitId: string;

  @ApiProperty({ type: String, description: 'Trait specialization', example: 'body-development', required: false })
  @IsString()
  @IsOptional()
  specialization: string | undefined;

  static toCommand(characterId: string, dto: DeleteTraitDto, userId: string, roles: string[]): DeleteTraitCommand {
    return new DeleteTraitCommand(characterId, dto.traitId, dto.specialization, userId, roles);
  }
}

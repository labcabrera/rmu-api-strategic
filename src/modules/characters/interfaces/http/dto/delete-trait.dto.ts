import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeleteTraitCommand } from 'src/modules/characters/application/cqrs/commands/delete-trait.command';

export class DeleteTraitDto {
  @ApiProperty({ description: 'Trait identifier', example: 'prodigy' })
  @IsString()
  @IsNotEmpty()
  traitId: string;

  @ApiProperty({ description: 'Trait specialization', example: 'body-development', required: false })
  @IsString()
  @IsOptional()
  specialization: string | undefined;

  static toCommand(characterId: string, dto: DeleteTraitDto, userId: string, roles: string[]): DeleteTraitCommand {
    return new DeleteTraitCommand(characterId, dto.traitId, dto.specialization, userId, roles);
  }
}

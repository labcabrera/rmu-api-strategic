import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AddTraitCommand } from 'src/modules/characters/application/cqrs/commands/add-trait.command';

export class AddTraitDto {
  @ApiProperty({ description: 'Trait identifier', example: 'prodigy' })
  @IsString()
  @IsNotEmpty()
  traitId: string;

  @ApiProperty({ description: 'Trait tier', example: 2 })
  @IsNumber()
  @IsOptional()
  tier: number | undefined;

  @ApiProperty({ description: 'Trait value', example: 'body-development' })
  @IsString()
  @IsOptional()
  specialization: string | undefined;

  static toCommand(characterId: string, dto: AddTraitDto, userId: string, roles: string[]): AddTraitCommand {
    return new AddTraitCommand(characterId, dto.traitId, dto.tier, dto.specialization, userId, roles);
  }
}

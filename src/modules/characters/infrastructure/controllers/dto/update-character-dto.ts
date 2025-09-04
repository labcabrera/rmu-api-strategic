import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { UpdateCharacterCommand } from 'src/modules/characters/application/commands/update-character.command';

export class UpdateCharacterDto {
  @ApiProperty({ description: 'New character name', example: 'Sauron' })
  @IsOptional()
  @IsString()
  name: string | undefined;

  @ApiProperty({ description: 'New character faction', example: 'faction-001' })
  @IsOptional()
  @IsString()
  factionId: string | undefined;

  @ApiProperty({ description: 'New character description', example: 'The Dark Lord of Mordor' })
  @IsOptional()
  @IsString()
  description: string | undefined;

  static toCommand(characterId: string, dto: UpdateCharacterDto, userId: string, roles: string[]): UpdateCharacterCommand {
    const result = new UpdateCharacterCommand();
    result.characterId = characterId;
    result.name = dto.name;
    result.description = dto.description;
    result.userId = userId;
    result.roles = roles;
    return result;
  }
}

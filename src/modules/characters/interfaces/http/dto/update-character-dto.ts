import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { UpdateCharacterCommand } from 'src/modules/characters/application/cqrs/commands/update-character.command';
import { CharacterRoleplayInfoDto } from './character-roleplay-info.dto';

export class UpdateCharacterInfoDto {
  @ApiProperty({ description: 'Character height', example: 4.8, required: false })
  @IsOptional()
  @IsNumber()
  height?: number | undefined;

  @ApiProperty({ description: 'Character weight', example: 161, required: false })
  @IsOptional()
  @IsNumber()
  weight?: number | undefined;
}

export class UpdateCharacterDto {
  @ApiProperty({ description: 'New character name', example: 'Sauron' })
  @IsOptional()
  @IsString()
  name: string | undefined;

  @ApiProperty({ description: 'New character info', example: { height: 2.5, weight: 500 } })
  @IsOptional()
  @IsObject()
  info: UpdateCharacterInfoDto | undefined;

  @ApiProperty({ description: 'New character info', example: 'An all-seeing dark lord' })
  @IsOptional()
  @IsObject()
  roleplay: CharacterRoleplayInfoDto | undefined;

  @ApiProperty({ description: 'New character description', example: 'The Dark Lord of Mordor' })
  @IsOptional()
  @IsString()
  description: string | undefined;

  @ApiProperty({ description: 'New character image URL', example: '/images/foo.png', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string | undefined;

  static toCommand(characterId: string, dto: UpdateCharacterDto, userId: string, roles: string[]): UpdateCharacterCommand {
    return new UpdateCharacterCommand(characterId, dto.name, dto.info, dto.roleplay, dto.description, dto.imageUrl, userId, roles);
  }
}

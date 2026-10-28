import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, IsInt, Min, ValidateNested } from 'class-validator';
import { UpdateCharacterCommand } from '../../../application/cqrs/commands/update-character.command.js';
import { CharacterRoleplayInfoDto } from './character-roleplay-info.dto.js';

export class UpdateCharacterInfoDto {
  @ApiProperty({ type: Number, description: 'Character height', example: 4.8, required: false })
  @IsOptional()
  @IsNumber()
  height?: number | undefined;

  @ApiProperty({ type: Number, description: 'Character weight', example: 161, required: false })
  @IsOptional()
  @IsNumber()
  weight?: number | undefined;
}

export class UpdateCharacterDto {
  @ApiProperty({ type: String, description: 'New character name', example: 'Sauron' })
  @IsOptional()
  @IsString()
  name: string | undefined;

  @ApiProperty({ description: 'New character info', example: { height: 2.5, weight: 500 } })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateCharacterInfoDto)
  info: UpdateCharacterInfoDto | undefined;

  @ApiProperty({ description: 'New character info', example: 'An all-seeing dark lord' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CharacterRoleplayInfoDto)
  roleplay: CharacterRoleplayInfoDto | undefined;

  @ApiProperty({ type: String, description: 'New character description', example: 'The Dark Lord of Mordor' })
  @IsOptional()
  @IsString()
  description: string | undefined;

  @ApiProperty({ type: String, description: 'New character image URL', example: '/images/foo.png', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string | undefined;

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(characterId: string, dto: UpdateCharacterDto, userId: string, roles: string[]): UpdateCharacterCommand {
    return new UpdateCharacterCommand(
      characterId,
      dto.name,
      dto.info,
      dto.roleplay,
      dto.description,
      dto.imageUrl,
      userId,
      roles,
      dto.version,
    );
  }
}

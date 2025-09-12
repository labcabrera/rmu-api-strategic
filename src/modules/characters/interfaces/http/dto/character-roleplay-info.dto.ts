import { IsNumber, IsOptional, IsString } from 'class-validator';
import {
  CharacterGender,
  CharacterRoleplayInfo,
} from 'src/modules/characters/domain/value-objects/character-roleplay-info.vo';

export class CharacterRoleplayInfoDto {
  @IsOptional()
  @IsString()
  gender: CharacterGender | undefined;

  @IsOptional()
  @IsNumber()
  age: number | undefined;

  static fromEntity(roleplay: CharacterRoleplayInfo): CharacterRoleplayInfoDto {
    const dto = new CharacterRoleplayInfoDto();
    dto.gender = roleplay.gender;
    dto.age = roleplay.age;
    return dto;
  }
}

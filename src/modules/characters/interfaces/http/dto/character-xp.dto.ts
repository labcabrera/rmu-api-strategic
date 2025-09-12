import { IsNumber } from 'class-validator';
import { CharacterXP } from 'src/modules/characters/domain/value-objects/character-xp.entity';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/aggregates/character.aggregate';

export class CharacterXPDto {
  level: number;
  availableLevel: number;
  xp: number;
  developmentPoints: number;
  availableDevelopmentPoints: number;
  weaponDevelopment: WeaponDevelopmentType[];

  static fromEntity(entity: CharacterXP): CharacterXPDto {
    const dto = new CharacterXPDto();
    dto.level = entity.level;
    dto.availableLevel = entity.availableLevel;
    dto.xp = entity.xp;
    dto.developmentPoints = entity.developmentPoints;
    dto.availableDevelopmentPoints = entity.availableDevelopmentPoints;
    dto.weaponDevelopment = entity.weaponDevelopment;
    return dto;
  }
}

export class CharacterCreationXPDto {
  @IsNumber()
  level: number;

  @IsNumber()
  xp: number;
}

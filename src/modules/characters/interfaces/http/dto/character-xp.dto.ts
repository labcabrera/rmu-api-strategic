import { CharacterXP } from 'src/modules/characters/domain/value-objects/character-xp.vo';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';

export class CharacterXPDto {
  level: number;
  availableLevel: number;
  xp: number;
  devPoints: number;
  availableDevPoints: number;
  availableRaceDevPoints: number;
  weaponDevelopment: WeaponDevelopmentType[];

  static fromEntity(entity: CharacterXP): CharacterXPDto {
    const dto = new CharacterXPDto();
    dto.level = entity.level;
    dto.availableLevel = entity.availableLevel;
    dto.xp = entity.xp;
    dto.devPoints = entity.devPoints;
    dto.availableDevPoints = entity.availableDevPoints;
    dto.availableDevPoints = entity.availableDevPoints;
    dto.weaponDevelopment = entity.weaponDevelopment;
    return dto;
  }
}

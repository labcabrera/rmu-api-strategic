import { CharacterItemWeaponMode } from 'src/modules/characters/domain/value-objects/character-item-weapon-mode.vo';
import { CharacterItemWeaponRange } from 'src/modules/characters/domain/value-objects/character-item-weapon-range.vo';
import { CharacterItemWeapon } from 'src/modules/characters/domain/value-objects/character-item-weapon.vo';

export class CharacterItemWeaponDto {
  skillId: string;
  fumble: number;
  modes: CharacterItemWeaponMode[];
  activeMode: string;

  static fromEntity(entity: CharacterItemWeapon): CharacterItemWeaponDto | undefined {
    if (!entity) return undefined;
    const dto = new CharacterItemWeaponDto();
    dto.skillId = entity.skillId;
    dto.fumble = entity.fumble;
    dto.modes = entity.modes;
    dto.activeMode = entity.activeMode;
    return dto;
  }
}

export class CharacterItemWeaponRangeDto {
  from: number;
  to: number;
  bonus: number;

  static fromEntity(entity: CharacterItemWeaponRange): CharacterItemWeaponRangeDto {
    const dto = new CharacterItemWeaponRangeDto();
    dto.from = entity.from;
    dto.to = entity.to;
    dto.bonus = entity.bonus;
    return dto;
  }
}

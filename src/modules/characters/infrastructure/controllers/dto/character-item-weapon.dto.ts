import { CharacterItemWeapon, CharacterItemWeaponRange } from 'src/modules/characters/domain/entities/character-item.entity';

export class CharacterItemWeaponDto {
  attackTable: string;
  fumbleTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
  ranges: CharacterItemWeaponRangeDto[] | undefined;

  static fromEntity(entity: CharacterItemWeapon): CharacterItemWeaponDto | undefined {
    if (!entity) return undefined;
    const dto = new CharacterItemWeaponDto();
    dto.attackTable = entity.attackTable;
    dto.skillId = entity.skillId;
    dto.fumble = entity.fumble;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.requiredHands = entity.requiredHands;
    dto.throwable = entity.throwable;
    dto.ranges = entity.ranges?.map((e) => CharacterItemWeaponRangeDto.fromEntity(e));
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

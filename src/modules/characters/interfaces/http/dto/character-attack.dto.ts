import { CharacterAttack } from 'src/modules/characters/domain/value-objects/character-attack.vo';
import { CharacterAttackRange } from '../../../domain/value-objects/character-attack-range.vo';

export class CharacterAttackRangeDto {
  from: number;
  to: number;
  bonus: number;

  static fromEntity(entity: CharacterAttackRange): CharacterAttackRangeDto {
    const dto = new CharacterAttackRangeDto();
    dto.from = entity.from;
    dto.to = entity.to;
    dto.bonus = entity.bonus;
    return dto;
  }
}

export class CharacterAttackDto {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumbleTable: string;
  fumble: number;
  weaponFumble: number;
  bo: number;
  type: string;
  defaultAttack: boolean;
  meleeRange: number | null;
  ranges: CharacterAttackRangeDto[] | null;
  boModifiers: Record<string, number>;

  static fromEntity(entity: CharacterAttack): CharacterAttackDto {
    const dto = new CharacterAttackDto();
    dto.attackName = entity.attackName;
    dto.attackTable = entity.attackTable;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.fumbleTable = entity.fumbleTable;
    dto.fumble = entity.fumble;
    dto.weaponFumble = entity.weaponFumble;
    dto.bo = entity.bo;
    dto.type = entity.type;
    dto.defaultAttack = entity.defaultAttack;
    dto.meleeRange = entity.meleeRange;
    dto.ranges = entity.ranges ? entity.ranges.map(range => CharacterAttackRangeDto.fromEntity(range)) : null;
    dto.boModifiers = entity.boModifiers;
    return dto;
  }
}

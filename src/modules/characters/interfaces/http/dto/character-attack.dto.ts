import { CharacterAttack } from 'src/modules/characters/domain/value-objects/character-attack.vo';

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
    return dto;
  }
}

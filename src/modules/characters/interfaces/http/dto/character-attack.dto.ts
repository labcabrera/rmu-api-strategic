import { CharacterAttack } from 'src/modules/characters/domain/value-objects/character-attack.vo';

export class CharacterAttackDto {
  attackName: string;
  attackTable: string;
  sizeAdjustment: number;
  fumbleTable: string;
  fumble: number;
  bo: number;

  static fromEntity(entity: CharacterAttack): CharacterAttackDto {
    const dto = new CharacterAttackDto();
    dto.attackName = entity.attackName;
    dto.attackTable = entity.attackTable;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.fumbleTable = entity.fumbleTable;
    dto.fumble = entity.fumble;
    dto.bo = entity.bo;
    return dto;
  }
}

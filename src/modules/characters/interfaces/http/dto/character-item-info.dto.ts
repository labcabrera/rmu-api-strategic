import { CharacterItemInfo } from 'src/modules/characters/domain/value-objects/character-item.vo';

export class CharacterItemInfoDto {
  length: number | undefined;
  strength: number | undefined;
  weight: number;

  static fromEntity(info: CharacterItemInfo): CharacterItemInfoDto {
    const dto = new CharacterItemInfoDto();
    dto.length = info.length;
    dto.strength = info.strength;
    dto.weight = info.weight;
    return dto;
  }
}

import { CharacterTrait } from 'src/modules/characters/domain/value-objects/character-trait.vo';

export class CharacterTraitDto {
  traitId: string;
  isTalent: boolean;
  tier: number | undefined;
  cost: number;
  value: string | undefined;

  static fromEntity(entity: CharacterTrait): CharacterTraitDto {
    const dto = new CharacterTraitDto();
    dto.traitId = entity.traitId;
    dto.isTalent = entity.isTalent;
    dto.tier = entity.tier;
    dto.cost = entity.cost;
    dto.value = entity.value;
    return dto;
  }
}

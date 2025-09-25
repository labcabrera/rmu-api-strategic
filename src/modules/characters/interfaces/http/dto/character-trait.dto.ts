import { CharacterTrait } from 'src/modules/characters/domain/value-objects/character-trait.vo';

export class CharacterTraitDto {
  traitId: string;
  traitName: string;
  isTalent: boolean;
  tier: number | undefined;
  cost: number;
  specialization: string | undefined;

  static fromEntity(entity: CharacterTrait): CharacterTraitDto {
    const dto = new CharacterTraitDto();
    dto.traitId = entity.traitId;
    dto.traitName = entity.traitName;
    dto.isTalent = entity.isTalent;
    dto.tier = entity.tier;
    dto.cost = entity.cost;
    dto.specialization = entity.specialization;
    return dto;
  }
}

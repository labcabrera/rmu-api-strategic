import { ApiProperty } from '@nestjs/swagger';
import { CharacterTrait, type CharacterTraitSource } from 'src/modules/characters/domain/value-objects/character-trait.vo';

export class CharacterTraitDto {
  traitId: string;
  traitName: string;
  isTalent: boolean;
  tier: number | undefined;
  cost: number;
  specialization: string | undefined;

  @ApiProperty({
    description: 'Origin of the trait: chosen for the character or copied from the race (race traits cannot be deleted)',
    enum: ['character', 'race'],
    example: 'character',
  })
  source: CharacterTraitSource;

  static fromEntity(entity: CharacterTrait): CharacterTraitDto {
    const dto = new CharacterTraitDto();
    dto.traitId = entity.traitId;
    dto.traitName = entity.traitName;
    dto.isTalent = entity.isTalent;
    dto.tier = entity.tier;
    dto.cost = entity.cost;
    dto.specialization = entity.specialization;
    dto.source = entity.source ?? 'character';
    return dto;
  }
}

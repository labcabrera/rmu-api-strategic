import { ApiProperty } from '@nestjs/swagger';
import { CharacterTrait, type CharacterTraitSource, type TraitPayment } from '../../../domain/value-objects/character-trait.vo';

export class CharacterTraitDto {
  traitId: string;
  traitName: string;
  isTalent: boolean;
  tier: number | undefined;
  cost: number;
  specialization: string | undefined;

  @ApiProperty({
    type: String,
    description: 'Origin of the trait: chosen for the character or copied from the race (race traits cannot be deleted)',
    enum: ['character', 'race'],
    example: 'character',
  })
  source: CharacterTraitSource;

  @ApiProperty({
    description: 'Development points used to pay the trait, by pool (negative values for the points granted by flaws)',
    required: false,
    example: { normal: 10, bonus: 5, flaw: 0, cappedBonus: 5, level: 1 },
  })
  paidWith: TraitPayment | undefined;

  static fromEntity(entity: CharacterTrait): CharacterTraitDto {
    const dto = new CharacterTraitDto();
    dto.traitId = entity.traitId;
    dto.traitName = entity.traitName;
    dto.isTalent = entity.isTalent;
    dto.tier = entity.tier;
    dto.cost = entity.cost;
    dto.specialization = entity.specialization;
    dto.source = entity.source ?? 'character';
    dto.paidWith = entity.paidWith;
    return dto;
  }
}

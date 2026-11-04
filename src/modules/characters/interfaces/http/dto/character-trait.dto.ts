import { ApiProperty } from '@nestjs/swagger';
import {
  CharacterTrait,
  type CharacterTraitSource,
  type TraitGrantedRanks,
  type TraitPayment,
} from '../../../domain/value-objects/character-trait.vo.js';

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

  @ApiProperty({ description: 'Imported without its entry in the core catalog: it has no effect (spec 024)', required: false })
  missingReference?: boolean;

  @ApiProperty({
    description: 'Skill ranks granted by the talent, removed with it (workspace spec 076: Multilingual)',
    required: false,
    example: [{ skillId: 'language-spoken', specialization: 'common', ranks: 10, created: true }],
  })
  grantedRanks?: TraitGrantedRanks[];

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
    if (entity.missingReference) dto.missingReference = true;
    if (entity.grantedRanks?.length) dto.grantedRanks = entity.grantedRanks.map(g => ({ ...g }));
    return dto;
  }
}

import { ApiProperty } from '@nestjs/swagger';
import {
  CharacterTrait,
  type CharacterTraitSource,
  type TraitAcquisition,
  type TraitGrantedRanks,
  type TraitLink,
  type TraitPayment,
  type TraitRestriction,
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

  @ApiProperty({
    description: 'How each tier of the talent was acquired (workspace spec 077, game option talentPurchaseRules)',
    required: false,
    example: [{ tier: 1, type: 'skill', value: 'perception' }],
  })
  acquiredBy?: TraitAcquisition[];

  @ApiProperty({ description: 'Talent a flaw was taken with (workspace spec 077)', required: false, example: { traitId: 'prodigy' } })
  linkedTo?: TraitLink;

  @ApiProperty({
    description: 'Restricted trait (workspace spec 077): it costs half and its sheet effects are situational',
    required: false,
    example: { note: 'Only underground' },
  })
  restricted?: TraitRestriction;

  @ApiProperty({ description: 'A flaw that waits for the approval of the game master (workspace spec 077)', required: false })
  pendingApproval?: boolean;

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
    if (entity.acquiredBy?.length) dto.acquiredBy = entity.acquiredBy.map(a => ({ ...a }));
    if (entity.linkedTo) dto.linkedTo = { ...entity.linkedTo };
    if (entity.restricted) dto.restricted = { ...entity.restricted };
    if (entity.pendingApproval) dto.pendingApproval = true;
    return dto;
  }
}

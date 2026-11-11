import { Prop, Schema } from '@nestjs/mongoose';
import type {
  CharacterTraitSource,
  TraitAcquisition,
  TraitGrantedRanks,
  TraitLink,
  TraitPayment,
  TraitRestriction,
} from '../../../domain/value-objects/character-trait.vo.js';

@Schema({ _id: false })
export class CharacterTrait {
  @Prop({ required: true })
  traitId: string;

  @Prop({ required: true })
  traitName: string;

  @Prop({ required: true })
  isTalent: boolean;

  @Prop({ type: Number, required: false })
  tier: number | undefined;

  @Prop({ required: true })
  cost: number;

  @Prop({ type: String, required: false })
  specialization: string | undefined;

  @Prop({ type: String, required: false, default: 'character' })
  source: CharacterTraitSource;

  @Prop({ type: Object, required: false })
  paidWith?: TraitPayment;

  @Prop({ type: Boolean, required: false })
  missingReference?: boolean;

  // Workspace spec 076, A7: skill ranks granted by the talent
  @Prop({ type: [Object], required: false, default: undefined })
  grantedRanks?: TraitGrantedRanks[];

  // Workspace spec 077, C11 and C12: purchase data
  @Prop({ type: [Object], required: false, default: undefined })
  acquiredBy?: TraitAcquisition[];

  @Prop({ type: Object, required: false })
  linkedTo?: TraitLink;

  @Prop({ type: Object, required: false })
  restricted?: TraitRestriction;

  @Prop({ type: Boolean, required: false })
  pendingApproval?: boolean;
}

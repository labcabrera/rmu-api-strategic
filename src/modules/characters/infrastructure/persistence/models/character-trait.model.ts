import { Prop, Schema } from '@nestjs/mongoose';
import type { CharacterTraitSource, TraitGrantedRanks, TraitPayment } from '../../../domain/value-objects/character-trait.vo.js';

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
}

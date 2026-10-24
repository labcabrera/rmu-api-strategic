import { Prop, Schema } from '@nestjs/mongoose';
import type { CharacterTraitSource, TraitPayment } from '../../../domain/value-objects/character-trait.vo';

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
}

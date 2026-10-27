import { Prop, Schema } from '@nestjs/mongoose';
import type { Difficulty } from '../../../../characters/domain/value-objects/difficulty.vo.js';
import type { ArmorClass } from '../../../domain/value-objects/item-armor.vo.js';

@Schema({ _id: false })
export class ItemArmor {
  @Prop({ required: true })
  slot: string;

  @Prop({ required: true })
  at: number;

  @Prop({ required: true })
  enc: number;

  @Prop({ required: true })
  maneuverPenalty: number;

  @Prop({ required: true })
  rangedPenalty: number;

  @Prop({ required: true })
  perceptionPenalty: number;

  @Prop({ type: String, required: true })
  baseDifficulty: Difficulty;

  @Prop({ type: [String], required: false, default: undefined })
  coverage?: string[] | null;

  @Prop({ type: String, required: false })
  class?: ArmorClass | null;
}

import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ItemArmor {
  @Prop({ required: true })
  slot: string;

  @Prop({ required: true })
  at: number;

  @Prop({ required: true })
  enc: number;

  @Prop({ required: true })
  maneuver: number;

  @Prop({ required: true })
  rangedPenalty: number;

  @Prop({ required: true })
  perception: number;

  @Prop({ type: String, required: true })
  baseDifficulty: string;
}

import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class GameOptions {
  @Prop({ required: true })
  experienceMultiplier: number;

  @Prop({ required: true })
  fatigueMultiplier: number;

  @Prop({ required: true })
  boardScaleMultiplier: number;

  @Prop({ required: true })
  letality: number;
}

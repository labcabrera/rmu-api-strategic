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

@Schema({ _id: false })
export class GamePowerLevel {
  @Prop({ required: true })
  statRandomMin: number;

  @Prop({ required: true })
  statBoostPotential: number;

  @Prop({ required: true })
  statBoostTemporary: number;

  @Prop({ required: true })
  statCreationBoost: number;

  @Prop({ required: true })
  statCreationSwap: number;
}

import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class GamePowerLevel {
  @Prop({ required: true })
  baseDevPoints: number;

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

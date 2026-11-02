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

  @Prop({ type: Number, required: false, default: 20 })
  maxTraitCost: number;

  @Prop({ type: Number, required: false, default: 25 })
  raceDevPointsPerLevel: number;

  @Prop({ type: Number, required: false, default: 0 })
  creationBonusDevPoints: number;

  @Prop({ type: Number, required: false, default: 15 })
  statPoints: number;

  @Prop({ type: Number, required: false, default: 2 })
  knackCount: number;

  @Prop({ type: Number, required: false, default: 5 })
  knackBonus: number;
}

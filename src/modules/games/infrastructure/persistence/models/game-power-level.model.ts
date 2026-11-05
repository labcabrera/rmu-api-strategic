import { Prop, Schema } from '@nestjs/mongoose';
import type { GamePowerLevelPreset } from '../../../domain/value-objects/game-power-level.vo.js';

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

  // Workspace spec 079, E: the preset the values came from (informative)
  @Prop({ type: String, required: false })
  preset?: GamePowerLevelPreset | null;

  // Workspace spec 079, E: no default, a missing value falls back to the preset or 10 when the document is read
  @Prop({ type: Number, required: false })
  ppRecoveryPercent?: number;
}

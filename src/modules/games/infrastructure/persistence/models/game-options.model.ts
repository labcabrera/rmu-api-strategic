import { Prop, Schema } from '@nestjs/mongoose';
import type { StatGeneration, TalentPolicy } from '../../../domain/value-objects/game-options.vo.js';

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

  // No default: a missing value falls back to the legacy allowThirdRank when the document is read (workspace spec 076)
  @Prop({ type: Boolean, required: false })
  intenseTraining?: boolean;

  // Legacy name of intenseTraining, only read from documents stored before workspace spec 076 (migration 076)
  @Prop({ type: Boolean, required: false })
  allowThirdRank?: boolean;

  @Prop({ type: String, required: false, default: 'free' })
  talentPolicy: TalentPolicy;

  @Prop({ type: Boolean, required: false, default: false })
  bonusDevPointsCapAtCreation: boolean;

  @Prop({ type: String, required: false, default: 'roll' })
  statGeneration: StatGeneration;

  @Prop({ type: Boolean, required: false, default: true })
  openRounds: boolean;

  @Prop({ type: Boolean, required: false, default: false })
  allowSavingDevPoints: boolean;
}

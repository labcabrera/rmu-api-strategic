import { Prop, Schema } from '@nestjs/mongoose';
import type { StatGeneration, TalentPolicy } from '../../../domain/value-objects/game-options.vo';

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

  @Prop({ type: Boolean, required: false, default: false })
  allowThirdRank: boolean;

  @Prop({ type: String, required: false, default: 'free' })
  talentPolicy: TalentPolicy;

  @Prop({ type: Boolean, required: false, default: false })
  bonusDevPointsCapAtCreation: boolean;

  @Prop({ type: String, required: false, default: 'roll' })
  statGeneration: StatGeneration;

  @Prop({ type: Boolean, required: false, default: true })
  openRounds: boolean;
}

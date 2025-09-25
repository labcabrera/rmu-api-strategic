import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterEquipment {
  @Prop({ type: String, required: false })
  mainHand: string | undefined;

  @Prop({ type: String, required: false })
  offHand: string | undefined;

  @Prop({ type: String, required: false })
  body: string | undefined;

  @Prop({ type: String, required: false })
  head: string | undefined;

  @Prop({ type: String, required: false })
  arms: string | undefined;

  @Prop({ type: String, required: false })
  legs: string;

  @Prop({ type: Number, required: true })
  weight: number;

  @Prop({ type: Number, required: true })
  weightAllowance: number;

  @Prop({ type: Number, required: true })
  encumbrancePenalty: number;

  @Prop({ type: Number, required: true })
  baseManeuverPenalty: number;

  @Prop({ type: Number, required: true })
  maneuverPenalty: number;

  @Prop({ type: Number, required: true })
  rangedPenalty: number;

  @Prop({ type: Number, required: true })
  perceptionPenalty: number;

  @Prop({ type: String, required: false })
  movementBaseDifficulty: string | undefined;
}

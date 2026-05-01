import { Prop, Schema } from '@nestjs/mongoose';
import { EquipmentSlot } from 'src/modules/characters/domain/value-objects/character-equipment.vo';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo';

@Schema({ _id: false })
export class CharacterEquipment {
  @Prop({ type: Map, required: false })
  slots: Record<EquipmentSlot, string | null>;

  @Prop({ type: Number, required: true })
  weight: number;

  @Prop({ type: Number, required: true })
  weightAllowance: number;

  @Prop({ type: Number, required: true })
  weightPercent: number;

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

  @Prop({ type: String, required: true })
  movementBaseDifficulty: Difficulty;
}

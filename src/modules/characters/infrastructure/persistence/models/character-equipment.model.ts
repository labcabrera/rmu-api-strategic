import { Prop, Schema } from '@nestjs/mongoose';
import type { CharacterLoad, EquipmentSlot } from '../../../domain/value-objects/character-equipment.vo.js';
import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';

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

  // Workspace spec 077, B1.2 and B1.5
  @Prop({ type: Number, required: false })
  armorEncumbrance?: number;

  @Prop({ type: Object, required: false })
  load?: CharacterLoad;

  // Workspace spec 079, D2
  @Prop({ type: Number, required: false })
  dodgeEncumbrancePenalty?: number;
}

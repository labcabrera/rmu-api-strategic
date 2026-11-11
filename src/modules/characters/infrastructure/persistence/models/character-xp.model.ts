import { Prop, Schema } from '@nestjs/mongoose';
import type { WeaponDevelopmentType } from '../../../domain/value-objects/weapon-development-type.vo.js';
import type { IntenseTrainingSkill, StatGainPayment } from '../../../domain/value-objects/character-xp.vo.js';

@Schema({ _id: false })
export class CharacterXP {
  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  availableLevel: number;

  @Prop({ required: true })
  xp: number;

  @Prop({ required: true })
  devPoints: number;

  @Prop({ required: true })
  availableDevPoints: number;

  @Prop({ type: Number, required: false, default: 0 })
  availableBonusDevPoints: number;

  // Legacy name of availableBonusDevPoints, only read from documents stored before the rename
  @Prop({ type: Number, required: false })
  availableRaceDevPoints?: number;

  @Prop({ type: Number, required: false, default: 0 })
  bonusDevPointsSpentThisLevel: number;

  @Prop({ type: Number, required: false, default: 0 })
  flawDevPoints: number;

  @Prop({ required: true })
  availableStatLevelUp: number;

  @Prop({ required: true })
  developedStatLevelUp: number;

  @Prop({ required: true })
  weaponDevelopment: WeaponDevelopmentType[];

  // Workspace spec 076
  @Prop({ type: Object, required: false, default: null })
  intenseTrainingSkill: IntenseTrainingSkill | null;

  @Prop({ type: Number, required: false, default: 0 })
  savedDevPoints: number;

  @Prop({ type: [Object], required: false, default: [] })
  statGainPayments: StatGainPayment[];
}

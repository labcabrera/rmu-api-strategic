import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { ItemHolder } from '../../../../items/domain/value-objects/item-holder.vo.js';
import type { EnchantmentRequest, EnchantmentScr, EnchantmentStatus } from '../../../domain/aggregates/enchantment-project.js';
import type { EnchantmentPlan } from '../../../domain/services/enchantment-planner.js';

export type EnchantmentProjectDocument = EnchantmentProjectModel & Document;

/** Enchantment projects of workspace spec 064. */
@Schema({ collection: 'enchantment-projects', _id: false, versionKey: false })
export class EnchantmentProjectModel {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: Number, default: 0 })
  version: number;

  @Prop({ type: String, required: true, index: true })
  gameId: string;

  @Prop({ type: String, required: true, index: true })
  alchemistId: string;

  @Prop({ type: String, required: true })
  alchemistName: string;

  @Prop({ type: String, required: true, index: true })
  itemId: string;

  @Prop({ type: String, required: true })
  itemName: string;

  @Prop({ type: Object, required: true })
  request: EnchantmentRequest;

  @Prop({ type: Object, required: true })
  plan: EnchantmentPlan;

  @Prop({ type: [Object], required: true, default: [] })
  scr: EnchantmentScr[];

  @Prop({ type: String, required: true, index: true })
  status: EnchantmentStatus;

  @Prop({ type: Number, required: true, default: 0 })
  daysCompleted: number;

  @Prop({ type: Number, required: true, default: 0 })
  extraDays: number;

  @Prop({ type: Number, required: true, default: 0 })
  extraCost: number;

  @Prop({ type: String, required: false })
  notes: string | null;

  @Prop({ type: Object, required: false })
  payer: ItemHolder | null;

  @Prop({ type: Number, required: true, default: 0 })
  paid: number;

  @Prop({ type: Number, required: true, default: 0 })
  refunded: number;

  @Prop({ type: [String], required: true, default: [] })
  ledgerEntryIds: string[];

  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | null;

  @Prop({ type: Date, required: false })
  completedAt: Date | null;
}

export const EnchantmentProjectSchema = SchemaFactory.createForClass(EnchantmentProjectModel);

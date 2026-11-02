import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { ItemLedgerKind, LedgerManeuver, LedgerPayment } from '../../../domain/aggregates/item-ledger-entry.js';
import type { PriceBreakdown } from '../../../domain/services/price-calculator.js';

export type ItemLedgerEntryDocument = ItemLedgerEntryModel & Document;

/** Item ledger of workspace spec 023 (decision 6): one document per operation, never updated. */
@Schema({ collection: 'item-ledger', _id: false, versionKey: false })
export class ItemLedgerEntryModel {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: Number, default: 0 })
  version: number;

  @Prop({ type: String, required: true, index: true })
  gameId: string;

  @Prop({ type: String, required: true })
  kind: ItemLedgerKind;

  @Prop({ type: String, required: false, index: true })
  itemId: string | null;

  @Prop({ type: [String], required: false, index: true, default: undefined })
  itemIds?: string[];

  @Prop({ type: String, required: false })
  itemTypeId: string | null;

  @Prop({ type: String, required: false })
  itemName: string | null;

  @Prop({ type: Number, required: false })
  amount: number | null;

  @Prop({ type: Object, required: false })
  from: ItemHolder | null;

  @Prop({ type: Object, required: false })
  to: ItemHolder | null;

  @Prop({ type: [String], required: true, index: true })
  holderIds: string[];

  @Prop({ type: [Object], required: true, default: [] })
  payments: LedgerPayment[];

  @Prop({ type: Object, required: false })
  price: PriceBreakdown | null;

  @Prop({ type: Object, required: false })
  maneuver: LedgerManeuver | null;

  @Prop({ type: String, required: false })
  actorId: string | null;

  @Prop({ type: String, required: false })
  outcome: string | null;

  @Prop({ type: String, required: false })
  note: string | null;

  /** Spec 024: data of the operation, like the file of an import. */
  @Prop({ type: Object, required: false })
  details?: Record<string, unknown> | null;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const ItemLedgerEntrySchema = SchemaFactory.createForClass(ItemLedgerEntryModel);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  CHRONICLE_CHAPTER_VISIBILITIES,
  type ChronicleChapterVisibility,
} from '../../../domain/value-objects/chronicle-chapter-visibility.vo.js';

export type ChronicleChapterDocument = ChronicleChapterModel & Document;

/** A chapter of the chronicle of a strategic game (workspace spec 102). */
@Schema({ collection: 'chronicle-chapters', _id: false, versionKey: false })
export class ChronicleChapterModel {
  @Prop({ required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write (the reorder does not move it). */
  @Prop({ type: Number, default: 0 })
  version: number;

  @Prop({ type: String, required: true })
  gameId: string;

  @Prop({ type: String, required: true })
  title: string;

  /** Markdown */
  @Prop({ type: String, default: '' })
  content: string;

  @Prop({ type: String, enum: CHRONICLE_CHAPTER_VISIBILITIES, required: true })
  visibility: ChronicleChapterVisibility;

  @Prop({ type: Number, required: true })
  order: number;

  /** The day of the campaign calendar */
  @Prop({ type: Number, required: false })
  campaignDate?: number;

  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;

  @Prop({ type: String, required: true })
  updatedBy: string;
}

export const ChronicleChapterSchema = SchemaFactory.createForClass(ChronicleChapterModel);
ChronicleChapterSchema.index({ gameId: 1, order: 1 });

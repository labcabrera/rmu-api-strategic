import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { HealingLogKind } from '../../../domain/value-objects/healing-log-entry.vo.js';

export type CharacterHealingLogDocument = CharacterHealingLogModel & Document;

@Schema({ collection: 'character-healing-log', _id: false, versionKey: false })
export class CharacterHealingLogModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  characterId: string;

  @Prop({ type: String, required: true })
  gameId: string;

  @Prop({ type: String, required: true })
  at: string;

  @Prop({ type: String, required: true })
  kind: HealingLogKind;

  @Prop({ type: String, required: false })
  injuryId?: string;

  @Prop({ type: String, required: false })
  tacticalGameId?: string;

  @Prop({ type: String, required: false })
  healerName?: string;

  @Prop({ type: Object, required: false, default: {} })
  summary: Record<string, unknown>;
}

export const CharacterHealingLogSchema = SchemaFactory.createForClass(CharacterHealingLogModel);
CharacterHealingLogSchema.index({ characterId: 1, at: -1 });

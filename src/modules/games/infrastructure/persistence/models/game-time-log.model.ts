import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { GameTimeLogCharacter, GameTimeLogType } from '../../../domain/value-objects/game-time-log-entry.vo.js';

export type GameTimeLogDocument = GameTimeLogModel & Document;

@Schema({ collection: 'game-time-log', _id: false, versionKey: false })
export class GameTimeLogModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: String, required: true })
  gameId: string;

  @Prop({ type: String, required: true })
  type: GameTimeLogType;

  @Prop({ type: Number, required: true })
  fromDay: number;

  @Prop({ type: Number, required: true })
  toDay: number;

  @Prop({ type: Number, required: true })
  days: number;

  @Prop({ type: Number, required: true })
  hours: number;

  @Prop({ type: String, required: false })
  note?: string;

  @Prop({ type: [Object], default: [] })
  characters: GameTimeLogCharacter[];

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  createdAt: string;
}

export const GameTimeLogSchema = SchemaFactory.createForClass(GameTimeLogModel);
GameTimeLogSchema.index({ gameId: 1, createdAt: -1 });

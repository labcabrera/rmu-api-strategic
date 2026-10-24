import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import { GameOptions } from './game-options.model.js';
import { GamePowerLevel } from './game-power-level.model.js';
import type { AccessType } from '../../../../shared/domain/entities/access-type.js';

export type GameDocument = GameModel & Document;

@Schema({ collection: 'strategic-games', _id: false, versionKey: false })
export class GameModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  realmId: string;

  @Prop({ required: true })
  realmName: string;

  @Prop({ type: String, required: true })
  status: GameStatus;

  @Prop({ required: true })
  options: GameOptions;

  @Prop({ required: true })
  powerLevel: GamePowerLevel;

  @Prop({ type: String, required: false })
  shortDescription: string | undefined;

  @Prop({ type: String, required: false })
  description?: string | undefined;

  @Prop({ type: String, required: false })
  imageUrl?: string | undefined;

  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: String, required: true })
  accessType: AccessType;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(GameModel);

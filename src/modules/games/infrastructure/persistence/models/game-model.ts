import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { GameStatus } from 'src/modules/games/domain/value-objects/game-status.vo';
import { GameOptions } from './game-options.model';
import { GamePowerLevel } from './game-power-level.model';
import type { AccessType } from 'src/modules/shared/domain/entities/access-type';

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

  @Prop({ required: true })
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

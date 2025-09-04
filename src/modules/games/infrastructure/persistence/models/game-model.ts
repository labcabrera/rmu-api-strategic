import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { GameOptions, GamePowerLevel } from './game.model-childs';
import * as game from 'src/modules/games/domain/entities/game';

export type GameDocument = GameModel & Document;

@Schema({ collection: 'strategic-games', versionKey: false })
export class GameModel {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  realm: string;

  @Prop({ required: true })
  status: game.GameStatus;

  @Prop({ required: true })
  options: GameOptions;

  @Prop({ required: true })
  powerLevel: GamePowerLevel;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(GameModel);

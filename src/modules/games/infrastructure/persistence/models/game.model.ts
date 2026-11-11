import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameCalendarModel, GameCalendarSchema } from './game-calendar.model.js';
import { Document } from 'mongoose';
import type { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import { GameOptions } from './game-options.model.js';
import { GamePowerLevel } from './game-power-level.model.js';
import type { AccessType } from '../../../../shared/domain/entities/access-type.js';
import { GAME_MEMBER_ROLES, type GameMemberRole } from '../../../domain/value-objects/game-member.vo.js';

export type GameDocument = GameModel & Document;

/** A member of the game (spec 071). */
@Schema({ _id: false, versionKey: false })
export class GameMemberModel {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ type: String, enum: GAME_MEMBER_ROLES, required: true })
  role: GameMemberRole;

  @Prop({ type: Date, required: true })
  joinedAt: Date;
}

/** A request to join a public game (spec 071). */
@Schema({ _id: false, versionKey: false })
export class GameJoinRequestModel {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ type: String, required: false, default: null })
  message: string | null;

  @Prop({ type: Date, required: true })
  requestedAt: Date;
}

const GameMemberSchema = SchemaFactory.createForClass(GameMemberModel);
const GameJoinRequestSchema = SchemaFactory.createForClass(GameJoinRequestModel);

@Schema({ collection: 'strategic-games', _id: false, versionKey: false })
export class GameModel {
  @Prop({ required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write. Documents stored before it existed have none (version 0). */
  @Prop({ type: Number, default: 0 })
  version: number;

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

  /** Workspace spec 065; absent in games stored before it */
  @Prop({ type: GameCalendarSchema, required: false })
  calendar?: GameCalendarModel;

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

  /** Spec 071: missing in games stored before, which read as none. */
  @Prop({ type: [GameMemberSchema], default: [] })
  members: GameMemberModel[];

  @Prop({ type: [GameJoinRequestSchema], default: [] })
  joinRequests: GameJoinRequestModel[];

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(GameModel);
// The games a user is a member of (spec 071): listings and the access of their children.
GameSchema.index({ 'members.userId': 1 });

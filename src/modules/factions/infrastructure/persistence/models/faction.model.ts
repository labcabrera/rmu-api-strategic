import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FactionManagement } from './faction-management.model';

export type FactionDocument = FactionModel & Document;

@Schema({ collection: 'factions', _id: false, versionKey: false })
export class FactionModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: FactionManagement, required: true })
  management: FactionManagement;

  @Prop({ type: String, required: false })
  shortDescription: string | undefined;

  @Prop({ type: String, required: false })
  description: string | undefined;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const FactionSchema = SchemaFactory.createForClass(FactionModel);

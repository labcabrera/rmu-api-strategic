import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FactionManagement } from './faction.model-childs';

export type FactionDocument = FactionModel & Document;

@Schema({ collection: 'factions', versionKey: false })
export class FactionModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: FactionManagement, required: true })
  management: FactionManagement;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const FactionSchema = SchemaFactory.createForClass(FactionModel);

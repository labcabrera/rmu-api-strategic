import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CharacterLevelDevDocument = CharacterLevelDevModel & Document;

@Schema({ collection: 'characters-level-dev', versionKey: false })
export class CharacterLevelDevModel {
  @Prop({ required: true })
  characterId: string;

  @Prop({ required: true })
  level: number;

  @Prop({ type: Map, of: Number })
  skills: Map<string, number>;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const CharacterLevelDevSchema = SchemaFactory.createForClass(CharacterLevelDevModel);

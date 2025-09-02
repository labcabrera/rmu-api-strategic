import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import {
  CharacterAttack,
  CharacterDefense,
  CharacterEndurance,
  CharacterEquipment,
  CharacterHP,
  CharacterInfo,
  CharacterInitiative,
  CharacterItem,
  CharacterMovement,
  CharacterPower,
  CharacterSkill,
  CharacterStatistics,
  CharacterXP,
} from './character-childs.model';

export type CharacterDocument = CharacterModel & Document;

@Schema({ collection: 'characters', versionKey: false })
export class CharacterModel {
  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  factionId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: CharacterInfo, required: true })
  info: CharacterInfo;

  @Prop({ type: CharacterXP, required: true })
  experience: CharacterXP;

  @Prop({ type: CharacterStatistics, required: true })
  statistics: CharacterStatistics;

  @Prop({ type: CharacterMovement, required: true })
  movement: CharacterMovement;

  @Prop({ type: CharacterDefense, required: true })
  defense: CharacterDefense;

  @Prop({ type: CharacterEndurance, required: true })
  endurance: CharacterEndurance;

  @Prop({ type: CharacterHP, required: true })
  hp: CharacterHP;

  power: CharacterPower | undefined;

  @Prop({ type: CharacterInitiative, required: true })
  initiative: CharacterInitiative;

  @Prop({ type: [CharacterSkill], required: true })
  skills: CharacterSkill[];

  @Prop({ type: [CharacterItem], required: true })
  items: CharacterItem[];

  @Prop({ type: CharacterEquipment, required: true })
  equipment: CharacterEquipment;

  @Prop({ type: [CharacterAttack], required: true })
  attacks: CharacterAttack[];

  status: string | undefined;

  @Prop({ type: String, required: false })
  description: string | undefined;

  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt?: Date;
}

export const CharacterSchema = SchemaFactory.createForClass(CharacterModel);

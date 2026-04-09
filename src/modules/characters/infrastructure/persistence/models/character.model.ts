import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  CharacterAttack,
  CharacterDefense,
  CharacterEndurance,
  CharacterHP,
  CharacterInfo,
  CharacterInitiative,
  CharacterPower,
  CharacterResistance,
  CharacterRoleplayInfo,
  CharacterXP,
} from './character-childs.model';
import { CharacterEquipment } from './character-equipment.model';
import type { CharacterStatus } from 'src/modules/characters/domain/value-objects/character-status.vo';
import { CharacterSkill } from './character-skill.model';
import { CharacterTrait } from './character-trait.model';
import { NamedEntity } from 'src/modules/shared/infrastructure/persistence/models/named-entity.model';
import { StatKey } from 'src/modules/characters/domain/value-objects/character-stat.vo';
import { CharacterStat, CharacterStatSchema } from './character-stat.model';
import { CharacterMovement } from './character-movement.model';

export type CharacterDocument = CharacterModel & Document;

@Schema({ collection: 'characters', _id: false, versionKey: false })
export class CharacterModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ type: NamedEntity, required: true })
  faction: NamedEntity;

  @Prop({ required: true })
  name: string;

  @Prop({ type: CharacterInfo, required: true })
  info: CharacterInfo;

  @Prop({ type: CharacterRoleplayInfo, required: true })
  roleplay: CharacterRoleplayInfo;

  @Prop({ type: CharacterXP, required: true })
  experience: CharacterXP;

  @Prop({ type: Map, of: CharacterStatSchema, required: true })
  statistics: Record<StatKey, CharacterStat>;

  @Prop({ type: CharacterMovement, required: true })
  movement: CharacterMovement;

  @Prop({ type: CharacterDefense, required: true })
  defense: CharacterDefense;

  @Prop({ type: [CharacterResistance], required: true })
  resistances: CharacterResistance[];

  @Prop({ type: CharacterEndurance, required: true })
  endurance: CharacterEndurance;

  @Prop({ type: CharacterHP, required: true })
  hp: CharacterHP;

  power: CharacterPower | undefined;

  @Prop({ type: CharacterInitiative, required: true })
  initiative: CharacterInitiative;

  @Prop({ type: [CharacterSkill], required: true })
  skills: CharacterSkill[];

  @Prop({ type: CharacterEquipment, required: true })
  equipment: CharacterEquipment;

  @Prop({ type: [CharacterAttack], required: true })
  attacks: CharacterAttack[];

  @Prop({ type: [CharacterTrait], required: true })
  traits: CharacterTrait[];

  @Prop({ type: String, required: true })
  status: CharacterStatus;

  @Prop({ type: String, required: false })
  description: string | undefined;

  @Prop({ type: String, required: false })
  imageUrl: string | undefined;

  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | undefined;
}

export const CharacterSchema = SchemaFactory.createForClass(CharacterModel);

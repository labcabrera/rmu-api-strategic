import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  CharacterEndurance,
  CharacterHP,
  CharacterInfo,
  CharacterInitiative,
  CharacterPower,
  CharacterResistance,
  CharacterRoleplayInfo,
} from './character-childs.model.js';
import { CharacterEquipment } from './character-equipment.model.js';
import type { CharacterStatus } from '../../../domain/value-objects/character-status.vo.js';
import { CharacterSkill } from './character-skill.model.js';
import { CharacterTrait } from './character-trait.model.js';
import { NamedEntity } from '../../../../shared/infrastructure/persistence/models/named-entity.model.js';
import type { StatKey } from '../../../domain/value-objects/character-stat.vo.js';
import { CharacterStat, CharacterStatSchema } from './character-stat.model.js';
import { CharacterMovement } from './character-movement.model.js';
import { CharacterDefense } from './character-defense.model.js';
import { CharacterAttack } from './character-attack.model.js';
import { CharacterXP } from './character-xp.model.js';
import type { Injury } from '../../../domain/value-objects/injury.vo.js';
import type { CharacterCondition } from '../../../domain/value-objects/character-condition.vo.js';

export type CharacterDocument = CharacterModel & Document;

@Schema({ collection: 'characters', _id: false, versionKey: false })
export class CharacterModel {
  /** Spec 024: the import that created it. */
  @Prop({ type: String, required: false, index: { sparse: true } })
  importId?: string;

  @Prop({ required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write. Documents stored before it existed have none (version 0). */
  @Prop({ type: Number, default: 0 })
  version: number;

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

  @Prop({ type: CharacterPower, required: false, default: null })
  power: CharacterPower | null;

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

  // Health (spec 013): stored as plain subdocuments with the shared Injury / CharacterCondition shape
  @Prop({ type: [Object], required: false, default: [] })
  injuries: Injury[];

  @Prop({ type: [Object], required: false, default: [] })
  conditions: CharacterCondition[];

  @Prop({ type: [String], required: false, default: [] })
  appliedTacticalGames: string[];

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

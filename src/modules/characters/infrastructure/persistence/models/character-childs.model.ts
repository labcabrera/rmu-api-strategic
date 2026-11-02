import { Prop, Schema } from '@nestjs/mongoose';
import type { CharacterRealm } from '../../../domain/value-objects/character-realm.vo.js';
import type { CharacterGender } from '../../../domain/value-objects/character-roleplay-info.vo.js';

@Schema({ _id: false })
export class CharacterInfo {
  @Prop({ type: Object, required: true })
  race: any; // will be NamedIdModel shape { id, name }

  @Prop({ required: true })
  professionId: string;

  @Prop({ required: true })
  sizeId: string;

  @Prop({ type: String, required: true })
  realmType: CharacterRealm;

  @Prop({ type: [String], required: false })
  realmTypes?: CharacterRealm[];

  @Prop({ required: true })
  height: number;

  @Prop({ required: true })
  weight: number;

  @Prop({ type: String, required: false })
  cultureId?: string | null;

  @Prop({ type: Number, required: false })
  recoveryMultiplier?: number;
}

@Schema({ _id: false })
export class Stat {
  @Prop({ required: true })
  potential: number;

  @Prop({ required: true })
  temporary: number;

  @Prop({ required: true })
  bonus: number;

  @Prop({ required: true })
  racial: number;

  @Prop({ required: true })
  custom: number;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterStatistics {
  @Prop({ required: true })
  ag: Stat;
  @Prop({ required: true })
  co: Stat;
  @Prop({ required: true })
  em: Stat;
  @Prop({ required: true })
  in: Stat;
  @Prop({ required: true })
  me: Stat;
  @Prop({ required: true })
  pr: Stat;
  @Prop({ required: true })
  qu: Stat;
  @Prop({ required: true })
  re: Stat;
  @Prop({ required: true })
  sd: Stat;
  @Prop({ required: true })
  st: Stat;
}

@Schema({ _id: false })
export class CharacterHP {
  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}

@Schema({ _id: false })
export class CharacterEndurance {
  @Prop({ required: true })
  base: number;

  @Prop({ required: true })
  racialBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;

  @Prop({ required: true })
  accumulator: number;

  @Prop({ required: true })
  fatiguePenalty: number;
}

@Schema({ _id: false })
export class CharacterPower {
  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}

@Schema({ _id: false })
export class CharacterInitiative {
  @Prop({ type: Map, required: true })
  modifiers: Record<string, number>;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterRoleplayInfo {
  @Prop({ type: String, required: false })
  gender: CharacterGender | undefined;

  @Prop({ type: Number, required: false })
  age: number | undefined;
}

@Schema({ _id: false })
export class CharacterResistance {
  @Prop({ required: true })
  resistance: string;

  @Prop({ required: true })
  statBonus: number;

  @Prop({ required: true })
  racialBonus: number;

  @Prop({ required: true })
  realmBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  totalBonus: number;

  @Prop({ type: Number, required: false, default: 0 })
  traitBonus: number;

  @Prop({ type: Number, required: false, default: 0 })
  levelBonus: number;
}

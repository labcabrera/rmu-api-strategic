import { Prop, Schema } from '@nestjs/mongoose';
import { ProfessionalBonusType, WeaponDevelopmentType } from 'src/modules/characters/domain/entities/character.entity';

@Schema({ _id: false })
export class CharacterInfo {
  @Prop({ required: true })
  race: string;

  @Prop({ required: true })
  professionId: string;

  @Prop({ required: true })
  sizeId: string;

  @Prop({ required: true })
  height: number;

  @Prop({ required: true })
  weight: number;
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
export class CharacterMovement {
  @Prop({ required: true })
  baseMovementRate: number;

  @Prop({ required: true })
  strideRacialBonus: number;

  @Prop({ required: true })
  strideQuBonus: number;

  @Prop({ required: true })
  strideCustomBonus: number;
}

@Schema({ _id: false })
export class CharacterArmor {
  @Prop({ type: Number, required: false })
  at: number | undefined;

  @Prop({ type: Number, required: true })
  racialAt: number;

  @Prop({ type: Number, required: false })
  bodyAt: number | undefined;

  @Prop({ type: Number, required: false })
  headAt: number | undefined;

  @Prop({ type: Number, required: false })
  armsAt: number | undefined;

  @Prop({ type: Number, required: false })
  legsAt: number | undefined;
}

@Schema({ _id: false })
export class CharacterDefense {
  @Prop({ required: true })
  defensiveBonus: number;

  @Prop({ type: CharacterArmor, required: true })
  armor: CharacterArmor;
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
  @Prop({ required: true })
  baseBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  penaltyBonus: number;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterSkill {
  @Prop({ required: true })
  skillId: string;

  @Prop({ type: String, required: false })
  specialization: string | undefined;

  @Prop({ type: [String], required: true })
  statistics: string[];

  @Prop({ type: [String], required: false })
  professional: ProfessionalBonusType[] | undefined;

  @Prop({ required: true })
  ranks: number;

  @Prop({ required: true })
  statBonus: number;

  @Prop({ required: true })
  racialBonus: number;

  @Prop({ required: true })
  developmentBonus: number;

  @Prop({ required: true })
  professionalBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterItemInfo {
  @Prop({ required: false })
  length: number;

  @Prop({ required: false })
  strength: number;

  @Prop({ required: false })
  weight: number;

  @Prop({ required: false })
  productionTime: number;
}

@Schema({ _id: false })
export class CharacterItemWeapon {
  @Prop({ required: true })
  attackTable: string;

  @Prop({ required: true })
  skillId: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ required: true })
  sizeAdjustment: number;

  @Prop({ required: true })
  requiredHands: number;

  @Prop({ required: true })
  throwable: boolean;
}

@Schema({ _id: false })
export class CharacterItemWeaponRange {
  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;

  @Prop({ required: true })
  bonus: number;
}

@Schema({ _id: false })
export class CharacterItemArmor {
  @Prop({ required: true })
  slot: string;

  @Prop({ required: true })
  armorType: number;

  @Prop({ required: true })
  enc: number;

  @Prop({ required: true })
  maneuver: number;

  @Prop({ required: true })
  rangedPenalty: number;

  @Prop({ required: true })
  perception: number;
}

@Schema({ _id: false })
export class CharacterItemAffix {
  @Prop({ required: true })
  key: string;

  @Prop({ type: String, required: false })
  value: string | undefined;

  @Prop({ type: Number, required: false })
  bonus: number | undefined;

  @Prop({ type: String, required: false })
  description: string | undefined;
}

@Schema({ _id: false })
export class CharacterItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  itemTypeId: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  carried: boolean;

  @Prop({ type: CharacterItemWeapon, required: false })
  weapon: CharacterItemWeapon | undefined;

  @Prop({ type: [CharacterItemWeaponRange], required: false })
  weaponRange: CharacterItemWeaponRange[] | undefined;

  @Prop({ type: CharacterItemArmor, required: false })
  armor: CharacterItemArmor | undefined;

  @Prop({ type: [CharacterItemAffix], required: false })
  affixes: CharacterItemAffix[] | undefined;

  @Prop({ required: true })
  info: CharacterItemInfo;
}

@Schema({ _id: false })
export class CharacterEquipment {
  @Prop({ type: String, required: false })
  mainHand: string | undefined;

  @Prop({ type: String, required: false })
  offHand: string | undefined;

  @Prop({ type: String, required: false })
  body: string | undefined;

  @Prop({ type: String, required: false })
  head: string | undefined;

  @Prop({ type: String, required: false })
  arms: string | undefined;

  @Prop({ type: String, required: false })
  legs: string | undefined;

  @Prop({ type: Number, required: false })
  weight: number | undefined;
}

@Schema({ _id: false })
export class CharacterXP {
  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  availableLevel: number;

  @Prop({ required: true })
  xp: number;

  @Prop({ required: true })
  developmentPoints: number;

  @Prop({ required: true })
  availableDevelopmentPoints: number;

  @Prop({ required: true })
  weaponDevelopment: WeaponDevelopmentType[];
}

@Schema({ _id: false })
export class CharacterAttack {
  @Prop({ required: true })
  attackName: string;

  @Prop({ required: true })
  attackTable: string;

  @Prop({ required: true })
  sizeAdjustment: number;

  @Prop({ required: true })
  fumbleTable: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ required: true })
  bo: number;
}

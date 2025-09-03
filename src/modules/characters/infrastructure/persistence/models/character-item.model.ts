import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterItemInfo {
  @Prop({ type: Number, required: false })
  length: number | undefined;

  @Prop({ type: Number, required: false })
  strength: number | undefined;

  @Prop({ required: true })
  weight: number;
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
export class CharacterItemWeapon {
  @Prop({ required: true })
  attackTable: string;

  @Prop({ required: true })
  fumbleTable: string;

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

  @Prop({ type: [CharacterItemWeaponRange], required: false })
  ranges: CharacterItemWeaponRange[] | undefined;
}

@Schema({ _id: false })
export class CharacterItemArmor {
  @Prop({ required: true })
  slot: string;

  @Prop({ required: true })
  at: number;

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

  @Prop({ type: String, required: false })
  description: string | undefined;
}

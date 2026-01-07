import { Prop, Schema } from '@nestjs/mongoose';
import { CharacterItemWeapon } from './character-item-weapon.model';

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

  @Prop({ type: String, required: true })
  baseDifficulty: string;
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

  @Prop({ type: CharacterItemArmor, required: false })
  armor: CharacterItemArmor | undefined;

  @Prop({ type: [CharacterItemAffix], required: false })
  affixes: CharacterItemAffix[] | undefined;

  @Prop({ required: true })
  info: CharacterItemInfo;

  @Prop({ type: Boolean, required: false })
  stackable: boolean | undefined;

  @Prop({ type: Number, required: false })
  amount: number | undefined;

  @Prop({ type: String, required: false })
  description: string | undefined;
}

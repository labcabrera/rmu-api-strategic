import { Prop, Schema } from '@nestjs/mongoose';
import { ItemWeaponMode } from './item-weapon-mode.model.js';

@Schema({ _id: false })
export class ItemWeapon {
  @Prop({ required: true })
  skillId: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ type: [ItemWeaponMode], required: true })
  modes: ItemWeaponMode[];

  @Prop({ type: String, required: false })
  wielderSize?: string;

  @Prop({ type: [String], required: false })
  tags?: string[];
}

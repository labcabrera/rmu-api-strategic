import { Prop, Schema } from '@nestjs/mongoose';
import { ItemWeaponRange } from './item-weapon-range.model';

@Schema({ _id: false })
export class ItemWeaponMode {
  @Prop({ required: true })
  type: string;

  @Prop({ type: [String], required: true })
  attackTypes: string[];

  @Prop({ type: String, required: true })
  attackTable: string;

  @Prop({ type: String, required: true })
  fumbleTable: string;

  @Prop({ type: Number, required: true })
  sizeAdjustment: number;

  @Prop({ type: [ItemWeaponRange], required: false })
  ranges: ItemWeaponRange[] | undefined;
}

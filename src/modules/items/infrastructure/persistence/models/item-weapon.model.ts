import { Prop, Schema } from '@nestjs/mongoose';
import { ItemWeaponMode } from './item-weapon-mode.model';

@Schema({ _id: false })
export class ItemWeapon {
  @Prop({ required: true })
  skillId: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ type: [ItemWeaponMode], required: true })
  modes: ItemWeaponMode[];
}

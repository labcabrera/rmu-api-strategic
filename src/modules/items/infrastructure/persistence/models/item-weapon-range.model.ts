import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ItemWeaponRange {
  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;

  @Prop({ required: true })
  bonus: number;
}

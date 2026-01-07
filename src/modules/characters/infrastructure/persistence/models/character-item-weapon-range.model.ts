import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterItemWeaponRange {
  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;

  @Prop({ required: true })
  bonus: number;
}

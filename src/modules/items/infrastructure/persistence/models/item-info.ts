import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ItemInfo {
  @Prop({ type: Number, required: false })
  length: number | null;

  @Prop({ type: Number, required: true })
  weight: number;

  @Prop({ type: Number, required: false })
  strength: number | null;

  @Prop({ type: Boolean, required: true })
  stackable: boolean;
}

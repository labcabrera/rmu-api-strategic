import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ItemAffix {
  @Prop({ required: true })
  key: string;

  @Prop({ type: String, required: false })
  value: string | null;

  @Prop({ type: Number, required: false })
  bonus: number | null;

  @Prop({ type: String, required: false })
  description: string | null;
}

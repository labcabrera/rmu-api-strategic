import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ItemShield {
  @Prop({ required: true })
  db: number;

  @Prop({ required: true })
  blockCount: number;
}

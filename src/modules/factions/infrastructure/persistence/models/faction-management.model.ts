import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class FactionManagement {
  @Prop({ required: true })
  availableGold: number;
}

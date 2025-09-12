import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class FactionManagement {
  @Prop({ required: true })
  availableXP: number;

  @Prop({ required: true })
  availableGold: number;
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false, versionKey: false })
export class GameCalendarModel {
  @Prop({ type: String, default: '' })
  startDate: string;

  @Prop({ type: Number, default: 0 })
  elapsedDays: number;

  @Prop({ type: Number, default: 0 })
  elapsedHours: number;
}

export const GameCalendarSchema = SchemaFactory.createForClass(GameCalendarModel);

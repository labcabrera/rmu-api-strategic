import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterStat {
  @Prop({ type: Number, required: true })
  potential: number;

  @Prop({ type: Number, required: true })
  temporary: number;

  @Prop({ type: Map, required: true })
  modifiers: Record<string, number>;

  @Prop({ type: Number, required: true })
  totalBonus: number;
}

export const CharacterStatSchema = SchemaFactory.createForClass(CharacterStat);

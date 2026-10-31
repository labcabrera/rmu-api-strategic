import { Prop, Schema } from '@nestjs/mongoose';

/** An NPC of a faction (workspace spec 055). */
@Schema({ _id: false })
export class FactionNpcModel {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  npcId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  count: number;

  @Prop({ type: String, default: null })
  notes: string | null;
}

import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class NamedEntity {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;
}

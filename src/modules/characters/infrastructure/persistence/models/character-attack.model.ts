import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterAttackRange {
  @Prop({ type: Number, required: true })
  from: number;

  @Prop({ type: Number, required: true })
  to: number;

  @Prop({ type: Number, required: true })
  bonus: number;
}

@Schema({ _id: false })
export class CharacterAttack {
  @Prop({ required: true })
  attackName: string;

  @Prop({ required: true })
  attackTable: string;

  @Prop({ required: true })
  sizeAdjustment: number;

  @Prop({ required: true })
  fumbleTable: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ required: true })
  weaponFumble: number;

  @Prop({ required: true })
  bo: number;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  defaultAttack: boolean;

  @Prop({ type: Number, required: false })
  meleeRange: number | null;

  @Prop({ type: [CharacterAttackRange], required: false })
  ranges: CharacterAttackRange[] | null;

  @Prop({ type: Map, required: true })
  boModifiers: Record<string, number>;
}

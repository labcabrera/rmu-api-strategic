import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterArmor {
  @Prop({ type: Number, required: false })
  at: number | null;

  @Prop({ type: Number, required: true })
  racialAt: number;

  @Prop({ type: Number, required: false })
  bodyAt: number | null;

  @Prop({ type: Number, required: false })
  headAt: number | null;

  @Prop({ type: Number, required: false })
  armsAt: number | null;

  @Prop({ type: Number, required: false })
  legsAt: number | null;
}

@Schema({ _id: false })
export class CharacterShield {
  @Prop({ type: Number, required: true })
  db: number;

  @Prop({ type: Number, required: true })
  blockCount: number;
}

@Schema({ _id: false })
export class CharacterDefense {
  @Prop({ required: true })
  defensiveBonus: number;

  @Prop({ type: CharacterArmor, required: true })
  armor: CharacterArmor;

  @Prop({ type: CharacterShield, required: false })
  shield: CharacterShield | null;

  @Prop({ type: Number, required: false })
  protect: number;
}

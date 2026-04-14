import { Prop, Schema } from '@nestjs/mongoose';
import type { BmrModifierKey, Pace } from 'src/modules/characters/domain/value-objects/character-movement.vo';

@Schema({ _id: false })
export class CharacterMovement {
  @Prop({ type: Number, required: true })
  baseMovementRate: number;

  @Prop({ type: Map, required: true })
  modifiers: Record<BmrModifierKey, number>;

  @Prop({ type: String, required: true })
  maxPace: Pace;
}

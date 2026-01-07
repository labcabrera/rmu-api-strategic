import { Prop, Schema } from '@nestjs/mongoose';
import { CharacterItemWeaponMode } from './character-item-weapon-mode.model';

@Schema({ _id: false })
export class CharacterItemWeapon {
  @Prop({ required: true })
  skillId: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ type: [CharacterItemWeaponMode], required: true })
  modes: CharacterItemWeaponMode[];
}

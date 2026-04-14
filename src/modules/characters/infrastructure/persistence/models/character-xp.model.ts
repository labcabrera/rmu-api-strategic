import { Prop, Schema } from '@nestjs/mongoose';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';

@Schema({ _id: false })
export class CharacterXP {
  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  availableLevel: number;

  @Prop({ required: true })
  xp: number;

  @Prop({ required: true })
  devPoints: number;

  @Prop({ required: true })
  availableDevPoints: number;

  @Prop({ required: true })
  availableRaceDevPoints: number;

  @Prop({ required: true })
  availableStatLevelUp: number;

  @Prop({ required: true })
  developedStatLevelUp: number;

  @Prop({ required: true })
  weaponDevelopment: WeaponDevelopmentType[];
}

import { Prop, Schema } from '@nestjs/mongoose';
import { ProfessionalBonusType } from 'src/modules/characters/domain/value-objects/professional-bonus-type.vo';

@Schema({ _id: false })
export class CharacterSkill {
  @Prop({ required: true })
  skillId: string;

  @Prop({ type: String, required: false })
  specialization: string | undefined;

  @Prop({ type: [String], required: true })
  statistics: string[];

  @Prop({ type: [Number], required: true })
  development: number[];

  @Prop({ type: [String], required: false })
  professional: ProfessionalBonusType[] | undefined;

  @Prop({ required: true })
  ranks: number;

  @Prop({ required: true })
  ranksDeveloped: number;

  @Prop({ required: true })
  statBonus: number;

  @Prop({ required: true })
  racialBonus: number;

  @Prop({ required: true })
  developmentBonus: number;

  @Prop({ required: true })
  professionalBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  totalBonus: number;
}

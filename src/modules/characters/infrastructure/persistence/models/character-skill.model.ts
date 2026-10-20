import { Prop, Schema } from '@nestjs/mongoose';
import { ProfessionalBonusType } from 'src/modules/characters/domain/value-objects/professional-bonus-type.vo';
import type { SkillDevPointsSpent } from 'src/modules/characters/domain/value-objects/character-skill.vo';

@Schema({ _id: false })
export class CharacterSkill {
  @Prop({ required: true })
  skillId: string;

  @Prop({ type: String, required: false })
  specialization: string | null;

  @Prop({ type: [String], required: true })
  statistics: string[];

  @Prop({ type: [Number], required: true })
  development: number[];

  @Prop({ type: [String], required: false })
  professional: ProfessionalBonusType[] | null;

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

  @Prop({ type: Number, required: false, default: 0 })
  traitBonus: number;

  @Prop({ type: Number, required: false, default: 0 })
  cultureRanks: number;

  @Prop({ type: Object, required: false, default: () => ({ normal: 0, bonus: 0 }) })
  devPointsSpent: SkillDevPointsSpent;

  @Prop({ type: Number, required: false })
  knackBonus?: number;
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { AccessType } from 'src/modules/shared/domain/entities/access-type';
import { ItemWeapon } from './item-weapon.model';
import { ItemArmor } from './item-armor.model';
import { ItemAffix } from './item-affix.model';
import { ItemInfo } from './item-info';
import { ItemShield } from './item-shield.model';

export type ItemDocument = ItemModel & Document;

@Schema({ collection: 'items', _id: false, versionKey: false })
export class ItemModel {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true })
  gameId: string;

  @Prop({ type: String, required: false })
  factionId: string | null;

  @Prop({ type: String, required: false })
  characterId: string | null;

  @Prop({ type: String, required: true })
  itemTypeId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: Boolean, required: true })
  carried: boolean;

  @Prop({ type: ItemWeapon, required: false })
  weapon: ItemWeapon | null;

  @Prop({ type: ItemArmor, required: false })
  armor: ItemArmor | null;

  @Prop({ type: ItemShield, required: false })
  shield: ItemShield | null;

  @Prop({ type: [ItemAffix], required: true })
  affixes: ItemAffix[];

  @Prop({ type: ItemInfo, required: true })
  info: ItemInfo;

  @Prop({ type: Number, required: false })
  amount: number | null;

  @Prop({ type: String, required: false })
  description: string | null;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | null;

  @Prop({ type: String, required: true })
  accessType: AccessType;

  @Prop({ type: String, required: true })
  owner: string;
}

export const ItemSchema = SchemaFactory.createForClass(ItemModel);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { AccessType } from '../../../../shared/domain/entities/access-type.js';
import { ItemWeapon } from './item-weapon.model.js';
import { ItemArmor } from './item-armor.model.js';
import { ItemInfo } from './item-info.model.js';
import { ItemShield } from './item-shield.model.js';
import type { ItemModifier } from '../../../domain/value-objects/item-modifier.vo.js';
import type { ItemCoating } from '../../../domain/value-objects/item-coating.vo.js';
import type { ItemMaterial } from '../../../domain/value-objects/item-material.vo.js';
import type { ItemCatalogInfo } from '../../../domain/value-objects/item-catalog-info.vo.js';

export type ItemDocument = ItemModel & Document;

@Schema({ collection: 'items', _id: false, versionKey: false })
export class ItemModel {
  @Prop({ type: String, required: true })
  _id: string;

  /** Optimistic concurrency: +1 on each write. Documents stored before it existed have none (version 0). */
  @Prop({ type: Number, default: 0 })
  version: number;

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

  /** Spec 019: plain objects (see ItemModifier), missing in items stored before it. */
  @Prop({ type: [Object], required: false, default: [] })
  modifiers: ItemModifier[];

  @Prop({ type: ItemInfo, required: true })
  info: ItemInfo;

  @Prop({ type: Number, required: false })
  amount: number | null;

  @Prop({ type: String, required: false })
  description: string | null;

  /** Spec 023: copy of the catalog type (cost, rarity, production hours, image). */
  @Prop({ type: Object, required: false })
  catalog?: ItemCatalogInfo | null;

  @Prop({ type: Number, required: false })
  value?: number | null;

  @Prop({ type: Number, required: false })
  acquiredPrice?: number | null;

  @Prop({ type: Boolean, required: false })
  unrepairable?: boolean;

  /** Workspace spec 042: poison on the weapon. */
  @Prop({ type: Object, required: false })
  coating?: ItemCoating | null;

  /** Workspace spec 043: superior material it was crafted of. */
  @Prop({ type: Object, required: false })
  material?: ItemMaterial | null;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date | null;

  @Prop({ type: String, required: true })
  accessType: AccessType;

  @Prop({ type: String, required: true })
  owner: string;

  /** Spec 024: the import that created it. */
  @Prop({ type: String, required: false, index: { sparse: true } })
  importId?: string;
}

export const ItemSchema = SchemaFactory.createForClass(ItemModel);

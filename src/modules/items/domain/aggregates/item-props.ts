import type { AccessType } from '../../../shared/domain/entities/access-type.js';
import { ItemArmor } from '../value-objects/item-armor.vo.js';
import { ItemInfo } from '../value-objects/item-info.vo.js';
import { ItemWeapon } from '../value-objects/item-weapon.vo.js';
import { ItemShield } from '../value-objects/item-shield.vo.js';
import type { ItemModifier } from '../value-objects/item-modifier.vo.js';

export interface ItemProps {
  id: string;
  gameId: string;
  factionId: string | null;
  characterId: string | null;
  itemTypeId: string;
  name: string;
  category: string;
  carried: boolean;
  weapon: ItemWeapon | null;
  armor: ItemArmor | null;
  shield: ItemShield | null;
  /** Spec 019: missing in items stored before it. */
  modifiers: ItemModifier[];
  amount: number | null;
  info: ItemInfo;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  accessType: AccessType;
  owner: string;
}

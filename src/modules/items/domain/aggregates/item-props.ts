import type { AccessType } from '../../../shared/domain/entities/access-type.js';
import { ItemArmor } from '../value-objects/item-armor.vo.js';
import { ItemInfo } from '../value-objects/item-info.vo.js';
import { ItemWeapon } from '../value-objects/item-weapon.vo.js';
import { ItemShield } from '../value-objects/item-shield.vo.js';
import type { ItemModifier } from '../value-objects/item-modifier.vo.js';
import type { ItemCatalogInfo } from '../value-objects/item-catalog-info.vo.js';
import type { ItemCoating } from '../value-objects/item-coating.vo.js';

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
  /** Spec 023: copy of the catalog type, missing in items stored before it. */
  catalog?: ItemCatalogInfo | null;
  /** Spec 023: reference value of one unit in gold (catalog average cost, or the crafting price). */
  value?: number | null;
  /** Spec 023: gold paid for one unit when it was bought or crafted. */
  acquiredPrice?: number | null;
  /** Spec 023: an absolute failure repairing it when broken: it can no longer be repaired. */
  unrepairable?: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  accessType: AccessType;
  owner: string;
  /** Spec 024: the import that created it, to undo a failed import. */
  importId?: string;
  /** Workspace spec 042: poison on the weapon. */
  coating?: ItemCoating | null;
}

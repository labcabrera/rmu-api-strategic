import { AccessType } from 'src/modules/shared/domain/entities/access-type';
import { ItemAffix } from '../value-objects/item-affix.vo';
import { ItemArmor } from '../value-objects/item-armor.vo';
import { ItemInfo } from '../value-objects/item-info.vo';
import { ItemWeapon } from '../value-objects/item-weapon.vo';

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
  affixes: ItemAffix[];
  stackable: boolean;
  amount: number | null;
  info: ItemInfo;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  accessType: AccessType;
  owner: string;
}

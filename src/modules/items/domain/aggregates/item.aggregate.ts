import { randomUUID } from 'crypto';
import { BaseAggregateRoot } from 'src/modules/shared/domain/aggregates/base-aggregate';
import { ItemProps } from './item-props';
import { ItemCreatedEvent, ItemUpdatedEvent } from '../events/item.events';
import { ItemWeapon } from '../value-objects/item-weapon.vo';
import { ItemArmor } from '../value-objects/item-armor.vo';
import { ItemAffix } from '../value-objects/item-affix.vo';
import { ItemInfo } from '../value-objects/item-info.vo';
import { AccessType } from 'src/modules/shared/domain/entities/access-type';

export const goldCoin = 'gold-coin';

export class Item extends BaseAggregateRoot<ItemProps> {
  private constructor(
    public id: string,
    public gameId: string,
    public factionId: string | null,
    public characterId: string | null,
    public itemTypeId: string,
    public name: string,
    public category: string,
    public carried: boolean,
    public weapon: ItemWeapon | null,
    public armor: ItemArmor | null,
    public affixes: ItemAffix[],
    public info: ItemInfo,
    public amount: number | null,
    public description: string | null,
    public createdAt: Date,
    public updatedAt: Date | null,
    public accessType: AccessType,
    public owner: string,
  ) {
    super(id);
  }

  static create(props: Omit<ItemProps, 'id' | 'createdAt' | 'updatedAt'>): Item {
    const item = new Item(
      randomUUID(),
      props.gameId,
      props.factionId,
      props.characterId,
      props.itemTypeId,
      props.name,
      props.category,
      props.carried,
      props.weapon,
      props.armor,
      props.affixes,
      props.info,
      props.amount,
      props.description,
      new Date(),
      null,
      'public', //TODO
      props.owner,
    );
    item.apply(new ItemCreatedEvent(item));
    return item;
  }

  static fromProps(props: ItemProps): Item {
    return new Item(
      props.id,
      props.gameId,
      props.factionId,
      props.characterId,
      props.itemTypeId,
      props.name,
      props.category,
      props.carried,
      props.weapon,
      props.armor,
      props.affixes,
      props.info,
      props.amount,
      props.description,
      props.createdAt,
      props.updatedAt,
      props.accessType,
      props.owner,
    );
  }

  update(props: Partial<Omit<ItemProps, 'id' | 'gameId' | 'createdAt' | 'updatedAt'>>): void {
    const { factionId, characterId, name } = props;
    if (factionId) this.factionId = factionId;
    if (characterId) this.characterId = characterId;
    if (name) this.name = name;
    //TODO
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  addAmount(amount: number): void {
    if (this.itemTypeId !== goldCoin && !Number.isInteger(amount)) {
      throw new Error('Amount must be an integer for non-gold coin items');
    }
    if (this.info.stackable) {
      this.amount = (this.amount || 0) + amount;
      this.updatedAt = new Date();
      this.apply(new ItemUpdatedEvent(this));
    } else {
      throw new Error('Cannot add amount to non-stackable item');
    }
  }

  getProps(): ItemProps {
    return {
      id: this.id,
      gameId: this.gameId,
      factionId: this.factionId,
      characterId: this.characterId,
      itemTypeId: this.itemTypeId,
      name: this.name,
      category: this.category,
      carried: this.carried,
      weapon: this.weapon,
      armor: this.armor,
      affixes: this.affixes,
      info: this.info,
      amount: this.amount,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accessType: this.accessType,
      owner: this.owner,
    };
  }
}

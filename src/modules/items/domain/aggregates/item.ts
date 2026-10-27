import { randomUUID } from 'crypto';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import type { ItemProps } from './item-props.js';
import { ItemCreatedEvent, ItemUpdatedEvent } from '../events/item.events.js';
import { ItemWeapon } from '../value-objects/item-weapon.vo.js';
import { ItemArmor } from '../value-objects/item-armor.vo.js';
import { ItemInfo } from '../value-objects/item-info.vo.js';
import type { AccessType } from '../../../shared/domain/entities/access-type.js';
import { ItemShield } from '../value-objects/item-shield.vo.js';
import { type ItemCondition, type ItemModifier, ItemModifiers } from '../value-objects/item-modifier.vo.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemCatalogInfo } from '../value-objects/item-catalog-info.vo.js';
import { type ItemHolder, ItemHolders } from '../value-objects/item-holder.vo.js';
import type { ItemCoating } from '../value-objects/item-coating.vo.js';

/** Item type of the coins of a character (spec 023, decision 7: they weigh). */
export const GOLD_COIN = 'gold-coin';

export class Item extends BaseAggregateRoot<ItemProps> {
  public importId: string | undefined = undefined;
  /** Workspace spec 042: poison on the weapon. */
  public coating: ItemCoating | null = null;

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
    public shield: ItemShield | null,
    public modifiers: ItemModifier[],
    public info: ItemInfo,
    public amount: number | null,
    public description: string | null,
    public createdAt: Date,
    public updatedAt: Date | null,
    public accessType: AccessType,
    public owner: string,
    public catalog: ItemCatalogInfo | null = null,
    public value: number | null = null,
    public acquiredPrice: number | null = null,
    public unrepairable: boolean = false,
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
      props.shield,
      props.modifiers || [],
      props.info,
      props.amount,
      props.description,
      new Date(),
      null,
      'public', //TODO
      props.owner,
      props.catalog ?? null,
      props.value ?? null,
      props.acquiredPrice ?? null,
      props.unrepairable ?? false,
    );
    item.importId = props.importId;
    item.coating = props.coating ?? null;
    item.apply(new ItemCreatedEvent(item));
    return item;
  }

  static fromProps(props: ItemProps): Item {
    const item = new Item(
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
      props.shield,
      props.modifiers || [],
      props.info,
      props.amount,
      props.description,
      props.createdAt,
      props.updatedAt,
      props.accessType,
      props.owner,
      props.catalog ?? null,
      props.value ?? null,
      props.acquiredPrice ?? null,
      props.unrepairable ?? false,
    );
    item.importId = props.importId;
    item.coating = props.coating ?? null;
    return item;
  }

  update(props: Partial<Omit<ItemProps, 'id' | 'gameId' | 'createdAt' | 'updatedAt'>>): void {
    const { factionId, characterId, name, weapon } = props;
    if (factionId) this.factionId = factionId;
    if (characterId) this.characterId = characterId;
    if (name) this.name = name;
    if (weapon) this.weapon = weapon;
    //TODO
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  /** Who holds it (spec 023, decision 1): stored as `characterId` or `factionId`. */
  get holder(): ItemHolder {
    return ItemHolders.of(this);
  }

  isHeldBy(holder: ItemHolder): boolean {
    return ItemHolders.equals(this.holder, holder);
  }

  /** Units in the item: the stack amount, or 1. */
  get units(): number {
    return this.info.stackable ? (this.amount ?? 1) : 1;
  }

  /** Reference value of one unit (spec 023, decision 2): its own, or the average cost of its type. */
  get unitValue(): number {
    return this.value ?? this.catalog?.cost?.average ?? 0;
  }

  /** Moves the item to another holder (spec 023, decision 8). A new holder does not carry it until it chooses to. */
  moveTo(holder: ItemHolder): void {
    const ids = ItemHolders.ids(ItemHolders.validate(holder));
    this.characterId = ids.characterId;
    this.factionId = ids.factionId;
    this.carried = false;
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  /** Takes `amount` units off a stack, which must keep at least one: a whole stack moves with moveTo. */
  takeAmount(amount: number): void {
    if (!this.info.stackable) throw new ValidationError('Only a stack can be split', 'err-item-not-stackable');
    if (!(amount > 0) || amount >= this.units) {
      throw new ValidationError(`Invalid amount ${amount} of a stack of ${this.units}`, 'err-item-invalid-amount');
    }
    this.addAmount(-amount);
  }

  /** The breakage modifiers after a repair (spec 023, decision 11); the other modifiers are kept. */
  replaceBreakage(breakage: ItemModifier[], unrepairable = this.unrepairable): void {
    this.modifiers = [...this.modifiers.filter(modifier => modifier.type !== 'breakage'), ...breakage];
    this.unrepairable = unrepairable;
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  addAmount(amount: number): void {
    if (this.itemTypeId !== GOLD_COIN && !Number.isInteger(amount)) {
      throw new Error('Amount must be an integer for non-gold coin items');
    }
    if (this.info.stackable) {
      // Gold is kept with three decimals (a copper piece is 0.001 gp)
      this.amount = Math.round(((this.amount || 0) + amount) * 1000) / 1000;
      this.updatedAt = new Date();
      this.apply(new ItemUpdatedEvent(this));
    } else {
      throw new Error('Cannot add amount to non-stackable item');
    }
  }

  /** Spec 019, decision 3: the breakage state, derived from the modifiers. */
  getCondition(): ItemCondition {
    return { ...ItemModifiers.condition(this.modifiers), ...(this.unrepairable ? { unrepairable: true } : {}) };
  }

  /** Adds the modifiers it has not yet (by id), so applying a tactical outcome twice adds nothing. Temporary ones are left out. */
  addModifiers(modifiers: ItemModifier[]): ItemModifier[] {
    const added = modifiers.filter(modifier => !modifier.temporary && !this.modifiers.some(existing => existing.id === modifier.id));
    if (added.length === 0) {
      return [];
    }
    added.forEach(modifier => ItemModifiers.validate(modifier));
    this.modifiers = [...this.modifiers, ...added.map(modifier => ({ ...modifier }))];
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
    return added;
  }

  removeModifier(modifierId: string): void {
    if (!this.modifiers.some(modifier => modifier.id === modifierId)) {
      throw new NotFoundError('ItemModifier', modifierId, 'err-item-modifier-not-found');
    }
    this.modifiers = this.modifiers.filter(modifier => modifier.id !== modifierId);
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  /** Workspace spec 042, decision 11: poison on a weapon, replacing the one it had. */
  coat(coating: ItemCoating): void {
    if (!this.weapon) throw new ValidationError('Only a weapon can be coated with poison', 'err-item-not-weapon');
    this.coating = coating;
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  /** The coating dries, is wiped off or was spent in a tactical game. */
  removeCoating(): void {
    if (!this.coating) return;
    this.coating = null;
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
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
      shield: this.shield,
      modifiers: this.modifiers,
      info: this.info,
      amount: this.amount,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accessType: this.accessType,
      owner: this.owner,
      catalog: this.catalog,
      value: this.value,
      acquiredPrice: this.acquiredPrice,
      unrepairable: this.unrepairable,
      ...(this.importId ? { importId: this.importId } : {}),
      coating: this.coating,
    };
  }
}

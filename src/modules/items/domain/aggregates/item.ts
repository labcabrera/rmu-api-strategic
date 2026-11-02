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
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemCatalogInfo } from '../value-objects/item-catalog-info.vo.js';
import { type ItemHolder, ItemHolders } from '../value-objects/item-holder.vo.js';
import type { ItemCoating } from '../value-objects/item-coating.vo.js';
import type { ItemMaterial } from '../value-objects/item-material.vo.js';
import type { ItemCharges, ItemEnchantment, ItemGemSetting } from '../value-objects/item-enchantment.vo.js';
import { GEM_CATEGORY, type ItemSize, type JewelryClass } from '../services/item-unit-value.js';
import { roundGold } from '../services/price-calculator.js';

/** Item type of the coins of a character (spec 023, decision 7: they weigh). */
export const GOLD_COIN = 'gold-coin';

export class Item extends BaseAggregateRoot<ItemProps> {
  public importId: string | undefined = undefined;
  /** Workspace spec 042: poison on the weapon. */
  public coating: ItemCoating | null = null;
  /** Workspace spec 043: superior material it was crafted of. */
  public material: ItemMaterial | null = null;
  /** Workspace spec 062: size (null is medium), carats and cut of a gem, class of a jewel. */
  public size: ItemSize | null = null;
  public carats: number | null = null;
  public jewelryClass: JewelryClass | null = null;
  public cutFactor: number | null = null;
  /** Workspace spec 064: what an alchemist enchanted it with. */
  public enchantment: ItemEnchantment | null = null;
  /** Workspace spec 067: charges of a charged item, and the gems set in it. */
  public charges: ItemCharges | null = null;
  public settings: ItemGemSetting[] = [];

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
    item.material = props.material ?? null;
    item.applyInstanceFields(props);
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
    item.material = props.material ?? null;
    item.applyInstanceFields(props);
    return item;
  }

  private applyInstanceFields(
    props: Pick<ItemProps, 'size' | 'carats' | 'jewelryClass' | 'cutFactor' | 'enchantment' | 'charges' | 'settings'>,
  ): void {
    this.size = props.size ?? null;
    this.carats = props.carats ?? null;
    this.jewelryClass = props.jewelryClass ?? null;
    this.cutFactor = props.cutFactor ?? null;
    this.enchantment = props.enchantment ?? null;
    this.charges = props.charges ? { ...props.charges } : null;
    this.settings = (props.settings ?? []).map(setting => ({ ...setting }));
  }

  update(props: Partial<Omit<ItemProps, 'id' | 'gameId' | 'createdAt' | 'updatedAt'>>): void {
    const { factionId, characterId, name, weapon } = props;
    if (factionId) this.factionId = factionId;
    if (characterId) this.characterId = characterId;
    if (name) this.name = name;
    if (weapon) {
      this.weapon = weapon;
      // Workspace spec 062: the size of a weapon mirrors the size it is made for
      if (weapon.wielderSize) this.size = weapon.wielderSize as ItemSize;
    }
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

  /**
   * Workspace spec 064, decision 6: an alchemist finished enchanting it. The item keeps the enchantment, gains its
   * modifiers and is worth the market value of the enchantment (per unit). It is enchanted once.
   */
  enchant(enchantment: ItemEnchantment, modifiers: ItemModifier[], unitValue: number): void {
    if (this.enchantment) throw new ConflictError(`Item ${this.id} is already enchanted`, 'err-enchantment-item-enchanted');
    modifiers.forEach(modifier => ItemModifiers.validate(modifier));
    this.enchantment = enchantment;
    this.modifiers = [...this.modifiers, ...modifiers.map(modifier => ({ ...modifier }))];
    this.value = unitValue;
    this.updatedAt = new Date();
    this.apply(new ItemUpdatedEvent(this));
  }

  /**
   * Workspace spec 067, decision 8: spends (negative) or adds charges, between 0 and the maximum. `recharge` fills it.
   */
  changeCharges(delta: number): void {
    if (!this.charges) throw new ValidationError(`Item ${this.id} has no charges`, 'err-item-no-charges');
    if (!Number.isInteger(delta) || delta === 0) {
      throw new ValidationError('The change of charges must be a whole number other than 0', 'err-item-charges-invalid');
    }
    const current = this.charges.current + delta;
    if (current < 0 || current > this.charges.max) {
      throw new ValidationError(
        `The item has ${this.charges.current} of ${this.charges.max} charges: ${delta} is not possible`,
        'err-item-charges-invalid',
      );
    }
    this.charges = { ...this.charges, current };
    this.touch();
  }

  recharge(): void {
    if (!this.charges) throw new ValidationError(`Item ${this.id} has no charges`, 'err-item-no-charges');
    if (this.charges.current >= this.charges.max) throw new ValidationError('The item is fully charged', 'err-item-charges-full');
    this.charges = { ...this.charges, current: this.charges.max };
    this.touch();
  }

  /** Workspace spec 067, decision 18: the modern cut of a gem multiplies its value (optional rule of 2.4). */
  cut(cutFactor: number): void {
    if (this.category !== GEM_CATEGORY) throw new ValidationError('Only a gem can be cut', 'err-item-not-gem');
    if (this.cutFactor !== null) throw new ConflictError(`Gem ${this.id} already has a modern cut`, 'err-item-gem-cut');
    this.value = roundGold(this.unitValue * cutFactor);
    this.cutFactor = cutFactor;
    this.touch();
  }

  /** Workspace spec 067, decision 19: a gem set in the item, which adds its value. */
  setGem(setting: ItemGemSetting): void {
    if (this.category === GEM_CATEGORY) throw new ValidationError('A gem cannot be set in another gem', 'err-item-setting-invalid');
    if (this.info.stackable) throw new ValidationError('A gem cannot be set in a stack', 'err-item-setting-invalid');
    this.value = roundGold(this.unitValue + setting.value);
    this.settings = [...this.settings, { ...setting }];
    this.touch();
  }

  /** Takes a gem out: the item loses its value. */
  unsetGem(index: number): ItemGemSetting {
    const setting = Number.isInteger(index) ? this.settings[index] : undefined;
    if (!setting) throw new NotFoundError('ItemGemSetting', String(index), 'err-item-setting-not-found');
    this.settings = this.settings.filter((_, position) => position !== index);
    this.value = roundGold(Math.max(0, this.unitValue - setting.value));
    this.touch();
    return setting;
  }

  private touch(): void {
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
      material: this.material,
      ...(this.size ? { size: this.size } : {}),
      ...(this.carats !== null ? { carats: this.carats } : {}),
      ...(this.jewelryClass ? { jewelryClass: this.jewelryClass } : {}),
      ...(this.cutFactor !== null ? { cutFactor: this.cutFactor } : {}),
      ...(this.enchantment ? { enchantment: this.enchantment } : {}),
      ...(this.charges ? { charges: this.charges } : {}),
      // Undefined (not missing) when empty: an update removes the last setting from the stored document
      settings: this.settings.length ? this.settings : undefined,
    };
  }
}

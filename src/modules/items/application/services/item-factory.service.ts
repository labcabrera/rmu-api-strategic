import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { Item } from '../../domain/aggregates/item.js';
import type { ItemProps } from '../../domain/aggregates/item-props.js';
import { type ItemHolder, ItemHolders } from '../../domain/value-objects/item-holder.vo.js';
import type { ItemMaterial } from '../../domain/value-objects/item-material.vo.js';
import type { ItemModifier, ItemModifierTarget } from '../../domain/value-objects/item-modifier.vo.js';
import { ItemWeapon } from '../../domain/value-objects/item-weapon.vo.js';
import { type ItemInstanceSpec, type ItemSize, ItemUnitValue, type UnitValueType } from '../../domain/services/item-unit-value.js';
import { MagicItemMappings } from '../../domain/services/magic-item-mapping.js';
import type { MagicItemFeature } from '../../domain/value-objects/item-catalog-info.vo.js';
import type { ItemEnchantmentSource } from '../../domain/value-objects/item-enchantment.vo.js';
import { type ItemClientPort, type ItemResponse, ITEM_CLIENT } from '../ports/item-client.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../ports/item-repository.port.js';

export interface NewItemOptions {
  gameId: string;
  holder: ItemHolder;
  /** The character that will hold it: armor is sized to its weight. */
  character: Character | null;
  amount?: number | null;
  name?: string | null;
  description?: string | null;
  wielderSize?: string | null;
  carried?: boolean;
  value?: number | null;
  acquiredPrice?: number | null;
  modifiers?: ItemModifier[];
  /** Workspace spec 043: superior material of a crafted item. */
  material?: ItemMaterial | null;
  /** Workspace spec 043: factor of the weight (an Elven steel or lightened armor). */
  weightMultiplier?: number;
  owner: string;
  /**
   * Workspace spec 062: size, carats, cut, class and base value of a jewel. When `value` is missing the unit value is
   * computed from them (ItemUnitValue); the size also scales the weight and the length.
   */
  instance?: ItemInstanceSpec;
  /**
   * Workspace spec 067: the magic of the item. By default the `features.magic` block of its type; null makes a plain
   * item of a magic type.
   */
  magic?: MagicItemFeature | null;
  /** Where the magic comes from: `catalog` by default. */
  magicSource?: ItemEnchantmentSource;
}

/**
 * Builds and stores instances of the catalog types (workspace spec 023, decision 2): the instance copies what it
 * needs of its type, and the catalog `bonus` modifiers become modifiers of the instance (decision 4). Workspace spec
 * 067, decision 5: a type with `features.magic` gives its instances an enchantment, its OB/DB modifiers and charges.
 */
@Injectable()
export class ItemFactory {
  constructor(
    @Inject(ITEM_CLIENT) private readonly itemClient: ItemClientPort,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async itemType(itemTypeId: string): Promise<ItemResponse> {
    if (!itemTypeId) throw new ValidationError('itemTypeId is required', 'err-item-type-required');
    const itemType = await this.itemClient.getItemById(itemTypeId);
    if (!itemType) throw new ValidationError(`Invalid item type ${itemTypeId}`, 'err-item-type-not-found');
    return itemType;
  }

  /** The catalog data of the unit value of a type (workspace spec 062). */
  static valueType(itemType: ItemResponse): UnitValueType {
    // Workspace spec 067: a magic type without a cost is worth its standard price
    const standardPrice = itemType.features?.magic?.standardPrice;
    const cost =
      itemType.info.cost ?? (typeof standardPrice === 'number' ? { min: standardPrice, average: standardPrice, max: standardPrice } : null);
    return {
      category: itemType.category,
      cost,
      features: itemType.features ?? null,
      baseSize: itemType.weapon?.wielderSize ?? null,
    };
  }

  /**
   * The instance fields of a new item (workspace spec 062): a weapon takes `wielderSize` as its size and the other way
   * round (both must agree), and a jewel without a base value rolls it in the range of its type.
   */
  static instanceSpec(
    itemType: ItemResponse,
    options: Pick<NewItemOptions, 'instance' | 'wielderSize'>,
    random: () => number = Math.random,
  ): ItemInstanceSpec {
    const requested = options.instance ?? {};
    const wielderSize = options.wielderSize || null;
    if (wielderSize && requested.size && wielderSize !== requested.size) {
      throw new ValidationError('The size and the wielder size of a weapon must be the same', 'err-item-invalid-size');
    }
    const size = requested.size ?? (itemType.weapon ? (wielderSize as ItemSize | null) : null);
    return ItemUnitValue.resolve(ItemFactory.valueType(itemType), { ...requested, size }, random);
  }

  build(itemType: ItemResponse, options: NewItemOptions): Item {
    const stackable = itemType.info.stackable || false;
    if (!stackable && options.amount && options.amount !== 1) {
      throw new ValidationError(`${itemType.id} is not stackable`, 'err-item-not-stackable');
    }
    const instance = ItemFactory.instanceSpec(itemType, options);
    const steps = ItemUnitValue.steps(instance.size, itemType.weapon?.wielderSize);
    const enc = !!(options.character && itemType.armor && itemType.armor.enc);
    // Armor weighs a percent of its wearer, which already has its size
    const weight = enc
      ? this.weight(itemType, options.character)
      : ItemUnitValue.scaleWeight(this.weight(itemType, options.character), steps);
    const feature = options.magic !== undefined ? options.magic : (itemType.features?.magic ?? null);
    const magic = feature
      ? MagicItemMappings.map(feature, options.magicSource ?? 'catalog', {
          breakable: !!(itemType.weapon || itemType.armor || itemType.shield),
        })
      : null;
    const props: Omit<ItemProps, 'id' | 'createdAt' | 'updatedAt'> = {
      gameId: options.gameId,
      ...ItemHolders.ids(options.holder),
      itemTypeId: itemType.id,
      name: options.name || itemType.name || itemType.id,
      category: itemType.category,
      carried: options.carried ?? false,
      weapon: this.weapon(itemType, itemType.weapon ? (instance.size ?? options.wielderSize) : options.wielderSize),
      armor: itemType.armor,
      shield: itemType.shield,
      modifiers: [...this.catalogModifiers(itemType), ...(magic?.modifiers ?? []), ...(options.modifiers ?? [])],
      amount: stackable ? (options.amount ?? 1) : null,
      info: {
        length: ItemUnitValue.scaleLength(itemType.info.length, steps),
        weight: Math.round(weight * (options.weightMultiplier ?? 1) * 100) / 100,
        strength: itemType.info.strength,
        stackable,
      },
      description: options.description ?? itemType.description ?? null,
      catalog: {
        cost: itemType.info.cost ?? null,
        rarity: itemType.info.rarity ?? null,
        productionHours: itemType.info.productionHours ?? null,
        imageUrl: itemType.imageUrl ?? null,
        ...(itemType.info.lotSize ? { lotSize: itemType.info.lotSize } : {}),
        ...(itemType.features ? { features: itemType.features } : {}),
      },
      value: options.value ?? ItemUnitValue.unitValue(ItemFactory.valueType(itemType), instance),
      acquiredPrice: options.acquiredPrice ?? null,
      accessType: 'public', //TODO
      owner: options.owner,
      ...(options.material ? { material: options.material } : {}),
      ...(instance.size ? { size: instance.size } : {}),
      ...(instance.carats !== undefined && instance.carats !== null ? { carats: instance.carats } : {}),
      ...(instance.jewelryClass ? { jewelryClass: instance.jewelryClass } : {}),
      ...(instance.cutFactor !== undefined && instance.cutFactor !== null ? { cutFactor: instance.cutFactor } : {}),
      ...(magic ? { enchantment: magic.enchantment } : {}),
      ...(magic?.charges ? { charges: magic.charges } : {}),
    };
    return Item.create(props);
  }

  /**
   * Stores a new item. A stack joins the stack of the same type the holder already has when neither has modifiers
   * (a customized stack stays apart): item.updated instead of item.created (F-strategic-09).
   */
  async store(item: Item): Promise<{ item: Item; merged: boolean }> {
    if (item.info.stackable && item.modifiers.length === 0) {
      const stack = await this.itemRepository.findStack(item.holder, item.itemTypeId);
      if (stack && stack.modifiers.length === 0 && ItemFactory.sameInstance(stack, item)) {
        stack.addAmount(item.units);
        const updated = await this.itemRepository.update(stack);
        await this.events.publishChanges('item', stack);
        return { item: updated, merged: true };
      }
    }
    const saved = await this.itemRepository.save(item);
    await this.events.publishChanges('item', item);
    return { item: saved, merged: false };
  }

  /** Workspace spec 062: units of other size, carats, cut, class or value are not the same stack. */
  static sameInstance(a: Item, b: Item): boolean {
    return (
      (a.size ?? null) === (b.size ?? null) &&
      (a.carats ?? null) === (b.carats ?? null) &&
      (a.cutFactor ?? null) === (b.cutFactor ?? null) &&
      (a.jewelryClass ?? null) === (b.jewelryClass ?? null) &&
      // Workspace spec 067: charged units are not the same stack
      JSON.stringify(a.charges) === JSON.stringify(b.charges) &&
      ((a.size === null && a.carats === null && a.jewelryClass === null) || a.value === b.value)
    );
  }

  /** Undoes store(): the stack loses the units again, or the new item is deleted. */
  async unstore(stored: { item: Item; merged: boolean }, units: number): Promise<void> {
    const current = await this.itemRepository.findById(stored.item.id);
    if (!current) return;
    if (stored.merged) {
      current.addAmount(-units);
      await this.itemRepository.update(current);
      await this.events.publishChanges('item', current);
    } else {
      await this.itemRepository.deleteById(current.id);
    }
  }

  private weight(itemType: ItemResponse, character: Character | null): number {
    // Armor weighs a percent of the weight of its wearer
    if (character && itemType.armor && itemType.armor.enc) {
      return Math.round(((itemType.armor.enc * character.info.weight) / 100) * 100) / 100;
    }
    return itemType.info.weight || 0;
  }

  private weapon(itemType: ItemResponse, wielderSize: string | null | undefined): ItemWeapon | null {
    if (!itemType.weapon) {
      if (wielderSize) throw new ValidationError('wielderSize can only be set on weapons', 'err-item-invalid');
      return null;
    }
    const { skillId, fumble, modes, tags } = itemType.weapon;
    return new ItemWeapon(skillId, fumble, modes, wielderSize || itemType.weapon.wielderSize, tags?.length ? [...tags] : undefined);
  }

  /** Spec 023, decision 4: a catalog `bonus` is a bonus of the use of the item (attack, defense or maneuver). */
  private catalogModifiers(itemType: ItemResponse): ItemModifier[] {
    const appliesTo: ItemModifierTarget = itemType.weapon ? 'attack' : itemType.shield || itemType.armor ? 'defense' : 'maneuver';
    return (itemType.modifiers ?? [])
      .filter(modifier => modifier.type === 'bonus' && typeof modifier.value === 'number' && modifier.value !== 0)
      .map(modifier => ({
        id: randomUUID(),
        type: 'quality',
        value: modifier.value!,
        appliesTo,
        source: { kind: 'catalog' },
        description: 'catalog-bonus',
        createdAt: new Date().toISOString(),
      }));
  }
}

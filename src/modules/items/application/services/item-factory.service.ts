import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { Item } from '../../domain/aggregates/item.js';
import type { ItemProps } from '../../domain/aggregates/item-props.js';
import { type ItemHolder, ItemHolders } from '../../domain/value-objects/item-holder.vo.js';
import type { ItemModifier, ItemModifierTarget } from '../../domain/value-objects/item-modifier.vo.js';
import { ItemWeapon } from '../../domain/value-objects/item-weapon.vo.js';
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
  owner: string;
}

/**
 * Builds and stores instances of the catalog types (workspace spec 023, decision 2): the instance copies what it
 * needs of its type, and the catalog `bonus` modifiers become modifiers of the instance (decision 4).
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

  build(itemType: ItemResponse, options: NewItemOptions): Item {
    const stackable = itemType.info.stackable || false;
    if (!stackable && options.amount && options.amount !== 1) {
      throw new ValidationError(`${itemType.id} is not stackable`, 'err-item-not-stackable');
    }
    const props: Omit<ItemProps, 'id' | 'createdAt' | 'updatedAt'> = {
      gameId: options.gameId,
      ...ItemHolders.ids(options.holder),
      itemTypeId: itemType.id,
      name: options.name || itemType.name || itemType.id,
      category: itemType.category,
      carried: options.carried ?? false,
      weapon: this.weapon(itemType, options.wielderSize),
      armor: itemType.armor,
      shield: itemType.shield,
      modifiers: [...this.catalogModifiers(itemType), ...(options.modifiers ?? [])],
      amount: stackable ? (options.amount ?? 1) : null,
      info: {
        length: itemType.info.length,
        weight: this.weight(itemType, options.character),
        strength: itemType.info.strength,
        stackable,
      },
      description: options.description ?? itemType.description ?? null,
      catalog: {
        cost: itemType.info.cost ?? null,
        rarity: itemType.info.rarity ?? null,
        productionHours: itemType.info.productionHours ?? null,
        imageUrl: itemType.imageUrl ?? null,
      },
      value: options.value ?? itemType.info.cost?.average ?? null,
      acquiredPrice: options.acquiredPrice ?? null,
      accessType: 'public', //TODO
      owner: options.owner,
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
      if (stack && stack.modifiers.length === 0) {
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
    const { skillId, fumble, modes } = itemType.weapon;
    return new ItemWeapon(skillId, fumble, modes, wielderSize || itemType.weapon.wielderSize);
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

import { Inject, Injectable } from '@nestjs/common';
import type { PowerLevel } from '../../../enchantments/domain/value-objects/alchemy.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Item } from '../../domain/aggregates/item.js';
import { type MagicItemDesign, MagicItemPricing, type MagicItemQuote } from '../../domain/services/magic-item-pricing.js';
import { type ItemInstanceSpec, ItemUnitValue } from '../../domain/services/item-unit-value.js';
import type { MagicItemFeature } from '../../domain/value-objects/item-catalog-info.vo.js';
import type { ItemEnchantmentSource } from '../../domain/value-objects/item-enchantment.vo.js';
import type { ItemResponse } from '../ports/item-client.port.js';
import { TREASURE_TABLES_CLIENT, type TreasureTablesClientPort } from '../ports/treasure-tables-client.port.js';
import type { HolderContext } from './holder-access.service.js';
import { ItemFactory } from './item-factory.service.js';
import { PowerLevels } from './power-levels.service.js';

/** A magic item to make from a base item of the catalog (workspace spec 067, decision 7): `MagicItemRequest`. */
export interface MagicItemRequest extends MagicItemDesign {
  baseItemTypeId: string;
  name?: string | null;
}

/** A request checked and priced: the base type, the quote and the magic block of the new item. */
export interface PreparedMagicItem {
  request: MagicItemRequest;
  itemType: ItemResponse;
  quote: MagicItemQuote;
  feature: MagicItemFeature;
}

const MAX_BONUSES = 20;
const MAX_SPELLS = 20;

/**
 * Magic items of the game master and of the treasure (workspace spec 067, decision 7): the quote with the standard
 * tables of core and the formula of table 6-1a, and the new item with its enchantment through the ItemFactory.
 */
@Injectable()
export class MagicItems {
  constructor(
    private readonly itemFactory: ItemFactory,
    private readonly powerLevels: PowerLevels,
    @Inject(TREASURE_TABLES_CLIENT) private readonly treasureTables: TreasureTablesClientPort,
  ) {}

  async quote(request: MagicItemRequest, powerLevel?: PowerLevel | null): Promise<MagicItemQuote> {
    return (await this.prepare(request, powerLevel)).quote;
  }

  async prepare(request: MagicItemRequest, powerLevel?: PowerLevel | null): Promise<PreparedMagicItem> {
    MagicItems.validate(request);
    const itemType = await this.itemFactory.itemType(request.baseItemTypeId);
    // The base item is worth its unit value without its own magic (a magic base keeps only its base price)
    const baseValue = MagicItems.baseValue(itemType);
    const needsTables = !!request.standard || (request.spells ?? []).length > 0;
    const pricing = needsTables ? ((await this.treasureTables.getTreasureTables())?.standardPricing ?? null) : null;
    const quote = MagicItemPricing.quote({
      design: request,
      baseValue,
      baseAt: itemType.armor?.at ?? null,
      pricing,
      powerMultiplier: await this.powerLevels.multiplier(powerLevel),
    });
    return { request, itemType, quote, feature: MagicItemPricing.feature(request, quote, baseValue) };
  }

  /** The new item, not stored: it belongs to `holder` and is worth the price of the quote. */
  build(
    prepared: PreparedMagicItem,
    holder: HolderContext,
    options: {
      source: ItemEnchantmentSource;
      acquiredPrice: number | null;
      owner: string;
      amount?: number | null;
      instance?: ItemInstanceSpec;
    },
  ): Item {
    return this.itemFactory.build(prepared.itemType, {
      gameId: holder.gameId,
      holder: holder.holder,
      character: holder.character,
      amount: prepared.itemType.info.stackable ? (options.amount ?? 1) : null,
      name: prepared.request.name || null,
      value: prepared.quote.price,
      acquiredPrice: options.acquiredPrice,
      magic: prepared.feature,
      magicSource: options.source,
      ...(options.instance ? { instance: options.instance } : {}),
      owner: options.owner,
    });
  }

  /** Gold of the base item: its catalog value, or the base price of a magic type. */
  static baseValue(itemType: ItemResponse): number {
    const magic = itemType.features?.magic;
    if (magic && magic.basePrice !== null && magic.basePrice !== undefined) return magic.basePrice;
    const spec = ItemFactory.instanceSpec(itemType, {}, () => 0.5);
    return ItemUnitValue.unitValue({ ...ItemFactory.valueType(itemType), features: null }, spec) ?? 0;
  }

  static validate(request: MagicItemRequest): void {
    if ((request.bonuses ?? []).length > MAX_BONUSES || (request.spells ?? []).length > MAX_SPELLS) {
      throw new ValidationError(`A magic item has up to ${MAX_BONUSES} bonuses and ${MAX_SPELLS} spells`, 'err-magic-item-invalid');
    }
    if (request.charges !== undefined && request.charges !== null && !(Number.isInteger(request.charges) && request.charges > 0)) {
      throw new ValidationError('The charges must be a whole number over 0', 'err-magic-item-invalid');
    }
    if (request.price !== undefined && request.price !== null && !(request.price >= 0)) {
      throw new ValidationError('The price cannot be negative', 'err-magic-item-invalid');
    }
  }
}

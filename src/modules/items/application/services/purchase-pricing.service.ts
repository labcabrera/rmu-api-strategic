import { Injectable } from '@nestjs/common';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { LedgerManeuver } from '../../domain/aggregates/item-ledger-entry.js';
import {
  type PriceBreakdown,
  PriceCalculator,
  type PriceFactors,
  type PriceFactorSelection,
  roundGold,
  type TradingResult,
} from '../../domain/services/price-calculator.js';
import { type ItemInstanceSpec, ItemUnitValue } from '../../domain/services/item-unit-value.js';
import type { ItemResponse } from '../ports/item-client.port.js';
import { ItemFactory } from './item-factory.service.js';
import { PowerLevels } from './power-levels.service.js';
import { MagicItemMappings } from '../../domain/services/magic-item-mapping.js';
import type { PowerLevel } from '../../../enchantments/domain/value-objects/alchemy.vo.js';
import { type TradingRequest, TradingService } from './trading.service.js';

/** Items of a type that does not stack created by one purchase (spec 041, decision 12). */
export const MAX_ITEMS_PER_PURCHASE = 100;

/** Lines of one purchase order (workspace spec 048). */
export const MAX_ORDER_LINES = 50;

export interface PurchaseOrderLine {
  itemTypeId: string;
  amount: number;
  /** Workspace spec 062: size, carats, cut, class and base value of a jewel. */
  instance?: ItemInstanceSpec;
}

export interface PricedOrderLine {
  itemType: ItemResponse;
  amount: number;
  stackable: boolean;
  /** The instance fields with their defaults: the base value of a jewel is rolled once, here. */
  instance: ItemInstanceSpec;
  price: PriceBreakdown;
}

/** A quote shows the middle of the range of a jewel without a value; the purchase rolls it. */
const QUOTE_RANDOM = () => 0.5;

export interface PricedOrder {
  lines: PricedOrderLine[];
  factor?: PriceFactors;
  trading?: TradingResult;
  maneuver?: LedgerManeuver;
  total: number;
}

/**
 * Prices of a purchase (workspace spec 048): the market conditions and one Trading maneuver apply to every line of
 * the order, as if all its items had the same characteristics.
 */
@Injectable()
export class PurchasePricing {
  constructor(
    private readonly itemFactory: ItemFactory,
    private readonly trading: TradingService,
    private readonly powerLevels: PowerLevels,
  ) {}

  /** A non-stacking type is bought in whole units, up to MAX_ITEMS_PER_PURCHASE. */
  static checkAmount(itemType: ItemResponse, amount: number): void {
    if (!itemType.info.stackable && (!Number.isInteger(amount) || amount > MAX_ITEMS_PER_PURCHASE)) {
      throw new ValidationError(`Up to ${MAX_ITEMS_PER_PURCHASE} whole units of a type that does not stack`, 'err-item-invalid-amount');
    }
  }

  /**
   * Prices of the lines. `check` rejects a negotiation without a deal (the operation); without it the quote shows the
   * result and the prices without the Trading percent.
   */
  async order(
    lines: PurchaseOrderLine[],
    options: {
      factors?: PriceFactorSelection[];
      trading?: TradingRequest;
      powerLevel?: PowerLevel;
      character: Character | null;
      /** Workspace spec 079, E: the game of the buyer, whose preset is the power level when none is given */
      gameId?: string | null;
      check: boolean;
    },
  ): Promise<PricedOrder> {
    if (lines.length === 0 || lines.length > MAX_ORDER_LINES) {
      throw new ValidationError(`An order has from 1 to ${MAX_ORDER_LINES} lines`, 'err-order-invalid-lines');
    }
    const factor = options.factors?.length ? await this.factor('purchase', options.factors) : undefined;
    const negotiated = options.trading
      ? options.check
        ? await this.trading.resolve('purchase', options.trading, options.character)
        : await this.trading.evaluate('purchase', options.trading, options.character)
      : undefined;
    const trading = negotiated?.result;
    const powerMultiplier = await this.powerLevels.multiplier(options.powerLevel, options.gameId);
    const priced: PricedOrderLine[] = [];
    for (const line of lines) {
      const itemType = await this.itemFactory.itemType(line.itemTypeId);
      PurchasePricing.checkAmount(itemType, line.amount);
      const { instance, unitBase } = PurchasePricing.unitBase(
        itemType,
        line.instance,
        options.check ? Math.random : QUOTE_RANDOM,
        null,
        powerMultiplier,
      );
      const price = PriceCalculator.purchase(unitBase, line.amount, { factor, trading });
      priced.push({ itemType, amount: line.amount, stackable: !!itemType.info.stackable, instance, price });
    }
    return {
      lines: priced,
      ...(factor ? { factor } : {}),
      ...(trading ? { trading, maneuver: negotiated.maneuver } : {}),
      total: roundGold(priced.reduce((sum, line) => sum + line.price.total, 0)),
    };
  }

  /**
   * Workspace spec 062: the instance fields with their defaults and the gold of one unit (gem carats, jewelry class,
   * size). `random` rolls the base value of a jewel without one. Workspace spec 067, decision 6: the power level
   * multiplies the magic part of the standard price of a magic type, not its base item.
   */
  static unitBase(
    itemType: ItemResponse,
    requested: ItemInstanceSpec | undefined,
    random: () => number = Math.random,
    wielderSize?: string | null,
    powerMultiplier = 1,
  ): { instance: ItemInstanceSpec; unitBase: number } {
    const spec = ItemFactory.instanceSpec(itemType, { instance: requested, wielderSize }, random);
    const value = ItemUnitValue.unitValue(ItemFactory.valueType(itemType), spec) ?? 0;
    const magicPart = MagicItemMappings.enchantmentPart(itemType.features?.magic);
    const unitBase = powerMultiplier === 1 || magicPart === 0 ? value : roundGold(Math.max(0, value + (powerMultiplier - 1) * magicPart));
    return { instance: spec, unitBase };
  }

  /** Workspace spec 067: the multiplier of a power level (1 for the Superior level of the book). */
  powerMultiplier(powerLevel: PowerLevel | null | undefined, gameId?: string | null): Promise<number> {
    return this.powerLevels.multiplier(powerLevel, gameId);
  }

  /** The factor of the market conditions; they need the trading tables of core. */
  async factor(kind: 'purchase' | 'sale', selections: PriceFactorSelection[]): Promise<PriceFactors | undefined> {
    if (selections.length === 0) return undefined;
    const tables = await this.trading.tables();
    if (!tables) throw new ValidationError('Core has no trading tables imported', 'err-trading-tables-missing');
    return PriceCalculator.factor(tables, kind, selections);
  }
}

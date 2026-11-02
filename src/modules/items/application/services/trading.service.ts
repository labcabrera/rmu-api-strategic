import { Inject, Injectable } from '@nestjs/common';
import { type ManeuverClientPort, MANEUVER_CLIENT } from '../../../characters/application/ports/maneuver-client.port.js';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { UnprocessableError } from '../../../shared/domain/errors/errors.js';
import type { LedgerManeuver } from '../../domain/aggregates/item-ledger-entry.js';
import type { TradingTables } from '../../domain/value-objects/trading-tables.vo.js';
import { TRADING_TABLES_CLIENT, type TradingTablesClientPort } from '../ports/trading-tables-client.port.js';
import { type PriceKind, PriceCalculator, type TradingResult } from '../../domain/services/price-calculator.js';
import { skillBonus } from './skill-bonus.js';

export const TRADING_SKILL = 'trading';

/** A Trading maneuver of a purchase or sale: the roll of the active side and the bonuses. */
export interface TradingRequest {
  roll: number;
  unmodifiedRoll?: number;
  /** Trading bonus of the active side; by default the one of the character's sheet. */
  bonus?: number;
  /** Other modifiers: the merchant (100 less its total), reputation, language... */
  modifiers?: { key: string; value: number }[];
}

/**
 * Trading of a purchase or a sale. With the trading tables of core (Treasure Law, workspace spec 048) the total of the
 * active side gives the percent of the expected price from the negotiation table, and a total without a deal stops
 * the operation. Without them, the Core Law rule (workspace spec 023, decision 12; ADR 0007, S5): the total goes to
 * the percent maneuver table of core and the price is 200% less that percent (buying) or the percent (selling).
 */
@Injectable()
export class TradingService {
  constructor(
    @Inject(MANEUVER_CLIENT) private readonly maneuvers: ManeuverClientPort,
    @Inject(TRADING_TABLES_CLIENT) private readonly tablesClient: TradingTablesClientPort,
  ) {}

  /** Trading tables of core, or null to use the Core Law rule. */
  tables(): Promise<TradingTables | null> {
    return this.tablesClient.getTradingTables();
  }

  /** The result of the maneuver, also when there is no deal (a quote shows it). */
  async evaluate(
    kind: PriceKind,
    request: TradingRequest,
    character: Character | null,
  ): Promise<{ result: TradingResult; maneuver: LedgerManeuver }> {
    const bonus = request.bonus ?? skillBonus(character, TRADING_SKILL) ?? 0;
    const modifiers = request.modifiers ?? [];
    const total = request.roll + bonus + modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
    const maneuver: LedgerManeuver = {
      skillId: TRADING_SKILL,
      roll: request.roll,
      ...(request.unmodifiedRoll !== undefined ? { unmodifiedRoll: request.unmodifiedRoll } : {}),
      bonus,
      modifiers,
      total,
    };
    const tables = await this.tables();
    if (tables) {
      const row = PriceCalculator.negotiationRow(tables.negotiation, total);
      const percent = row ? row[kind] : null;
      const result: TradingResult = {
        total,
        pricePercent: row?.outcome === 'no-agreement' || row?.outcome === 'absolute-failure' ? null : percent,
        table: 'treasure-law',
        ...(row?.outcome ? { outcome: row.outcome } : {}),
      };
      if (result.pricePercent === null && !result.outcome) result.outcome = 'no-agreement';
      return { result, maneuver: { ...maneuver, ...(result.pricePercent !== null ? { percent: result.pricePercent } : {}) } };
    }
    const percent = await this.maneuvers.percent(total);
    const result: TradingResult = {
      total,
      maneuverPercent: percent.percent,
      pricePercent: PriceCalculator.tradingPercent(kind, percent.percent),
      table: 'core-law',
    };
    return { result, maneuver: { ...maneuver, percent: percent.percent } };
  }

  /** The result of the maneuver for an operation: without a deal it fails with 422 and nothing changes. */
  async resolve(
    kind: PriceKind,
    request: TradingRequest,
    character: Character | null,
  ): Promise<{ result: TradingResult; maneuver: LedgerManeuver }> {
    const evaluated = await this.evaluate(kind, request, character);
    TradingService.checkDeal(evaluated.result);
    return evaluated;
  }

  static checkDeal(result: TradingResult | undefined): void {
    if (!result || result.pricePercent !== null) return;
    if (result.outcome === 'absolute-failure') {
      throw new UnprocessableError('The negotiation ended in an absolute failure', 'err-trading-absolute-failure', { total: result.total });
    }
    throw new UnprocessableError('The negotiation reached no agreement', 'err-trading-no-agreement', { total: result.total });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { type ManeuverClientPort, MANEUVER_CLIENT } from '../../../characters/application/ports/maneuver-client.port.js';
import { Character } from '../../../characters/domain/aggregates/character.js';
import type { LedgerManeuver } from '../../domain/aggregates/item-ledger-entry.js';
import { type PriceKind, PriceCalculator, type TradingResult } from '../../domain/services/price-calculator.js';
import { skillBonus } from './skill-bonus.js';

export const TRADING_SKILL = 'trading';

/** A Trading maneuver of a purchase or sale: the roll of the active side and the bonuses. */
export interface TradingRequest {
  roll: number;
  unmodifiedRoll?: number;
  /** Trading bonus of the active side; by default the one of the character's sheet. */
  bonus?: number;
  /** Other modifiers: the Trading of the merchant (negative), market conditions, language... */
  modifiers?: { key: string; value: number }[];
}

/**
 * Trading as an opposed percent maneuver (workspace spec 023, decision 12; ADR 0007, S5): the total goes to the
 * percent maneuver table of core, and the percent gives the price as in rmu-api-tactical.
 */
@Injectable()
export class TradingService {
  constructor(@Inject(MANEUVER_CLIENT) private readonly maneuvers: ManeuverClientPort) {}

  async resolve(
    kind: PriceKind,
    request: TradingRequest,
    character: Character | null,
  ): Promise<{ result: TradingResult; maneuver: LedgerManeuver }> {
    const bonus = request.bonus ?? skillBonus(character, TRADING_SKILL) ?? 0;
    const modifiers = request.modifiers ?? [];
    const total = request.roll + bonus + modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
    const percent = await this.maneuvers.percent(total);
    const result: TradingResult = {
      total,
      maneuverPercent: percent.percent,
      pricePercent: PriceCalculator.tradingPercent(kind, percent.percent),
    };
    const maneuver: LedgerManeuver = {
      skillId: TRADING_SKILL,
      roll: request.roll,
      ...(request.unmodifiedRoll !== undefined ? { unmodifiedRoll: request.unmodifiedRoll } : {}),
      bonus,
      modifiers,
      total,
      percent: percent.percent,
    };
    return { result, maneuver };
  }
}

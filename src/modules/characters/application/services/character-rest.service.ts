import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { Character, type RestResult } from '../../domain/aggregates/character.js';
import { HealingCalculator } from '../../domain/services/healing/healing-calculator.js';
import { restPeriodHours, restPowerPeriods } from '../../domain/services/power/power-rules.js';
import { getEffectiveTraits } from '../../domain/services/character/traits/trait-effect-resolver.js';
import { ROUNDS_PER_HOUR, ROUNDS_PER_UNIT } from '../../domain/value-objects/poison.vo.js';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../ports/healing-tables-client.port.js';

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;

export interface RestInput {
  hours: number;
  days: number;
  fullRest: boolean;
  /** Workspace spec 077, D11: minutes of rest besides the hours and days (fatigue recovers one point per minute) */
  minutes?: number;
  /** Workspace spec 068: day of the campaign after the rest; the temporary modifiers expired by then are dropped */
  currentGameDay?: number;
  /**
   * Workspace spec 079, C2 (§13.1): the character travels or works instead of resting. Hits, power points and fatigue
   * only recover in the sleep hours (8 a day, whole days only), the untreated injuries do not improve and the treated
   * ones count each day once (never as complete rest).
   */
  active?: boolean;
  /** Workspace spec 079, E: percent of the power points per rest period, from the power level of the game (10 without it) */
  ppRecoveryPercent?: number;
}

/** §13.1: an active character only rests while it sleeps, 8 hours a day. */
export const ACTIVE_SLEEP_HOURS_PER_DAY = 8;

/**
 * A rest of a character: hits, injury counters, power points and poisonings (specs 013, 029 and 042). Shared by the
 * rest of one character and by the step of time of a campaign (workspace spec 065). It changes the aggregate only;
 * the caller stores it.
 */
@Injectable()
export class CharacterRestService {
  constructor(@Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort) {}

  /** The calculator, to reuse the healing tables when resting many characters. */
  async calculator(): Promise<HealingCalculator> {
    return new HealingCalculator(await this.healingTablesClient.getHealingTables());
  }

  /** A rest needs some time; checked before loading anything. */
  static checkTime(hours: number, days: number, minutes = 0): void {
    if (Math.max(0, hours || 0) === 0 && Math.max(0, days || 0) === 0 && Math.max(0, minutes || 0) === 0) {
      throw new ValidationError('Rest requires some minutes, hours or days', 'err-rest-time-required');
    }
  }

  async apply(character: Character, input: RestInput, calculator?: HealingCalculator): Promise<RestResult> {
    const hours = Math.max(0, input.hours || 0);
    const days = Math.max(0, input.days || 0);
    const minutes = Math.max(0, input.minutes || 0);
    CharacterRestService.checkTime(hours, days, minutes);
    if (character.status === 'dead') throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
    const calc = calculator ?? (await this.calculator());
    // Whole days count for the injury counters; every hour counts for the hits
    const elapsedDays = days + Math.floor(hours / HOURS_PER_DAY);
    const active = !!input.active;
    const counterDays = calc.restDays(elapsedDays, input.fullRest && !active);
    const totalHours = hours + days * HOURS_PER_DAY;
    // Workspace spec 079, C2: an active character only rests in its sleep hours
    const restHours = active ? elapsedDays * ACTIVE_SLEEP_HOURS_PER_DAY : totalHours;
    const hpAfter = calc.restHp(character.hp.max, character.hp.current, restHours);
    const summary = {
      ...(minutes ? { minutes } : {}),
      hours,
      restDays: days,
      fullRest: input.fullRest && !active,
      ...(active ? { active: true, sleepHours: restHours } : {}),
    };
    // Workspace spec 042: every hour of the rest advances the poisonings (and, spec 077, every minute).
    const poisonRounds = totalHours * ROUNDS_PER_HOUR + minutes * ROUNDS_PER_UNIT.minute;
    // Workspace spec 077, D11: one point of fatigue per minute of the whole rest
    const fatigueMinutes = restHours * MINUTES_PER_HOUR + minutes;
    // Workspace spec 079, D2: Efficient and Restless Sleeper change the length of the power point periods; the hits do
    // not change
    const periodHours = restPeriodHours(getEffectiveTraits(character.traits));
    return character.rest(
      hpAfter,
      counterDays,
      new Date().toISOString(),
      summary,
      active ? elapsedDays * restPowerPeriods(ACTIVE_SLEEP_HOURS_PER_DAY, 0, periodHours) : restPowerPeriods(hours, days, periodHours),
      poisonRounds,
      input.currentGameDay,
      fatigueMinutes,
      { freezeUntreated: active, ppRecoveryPercent: input.ppRecoveryPercent },
    );
  }
}

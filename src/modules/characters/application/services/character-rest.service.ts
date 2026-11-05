import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { Character, type RestResult } from '../../domain/aggregates/character.js';
import { HealingCalculator } from '../../domain/services/healing/healing-calculator.js';
import { restPowerPeriods } from '../../domain/services/power/power-rules.js';
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
}

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
    const counterDays = calc.restDays(elapsedDays, input.fullRest);
    const totalHours = hours + days * HOURS_PER_DAY;
    const hpAfter = calc.restHp(character.hp.max, character.hp.current, totalHours);
    const summary = { ...(minutes ? { minutes } : {}), hours, restDays: days, fullRest: input.fullRest };
    // Workspace spec 042: every hour of the rest advances the poisonings (and, spec 077, every minute).
    const poisonRounds = totalHours * ROUNDS_PER_HOUR + minutes * ROUNDS_PER_UNIT.minute;
    // Workspace spec 077, D11: one point of fatigue per minute of the whole rest
    const fatigueMinutes = totalHours * MINUTES_PER_HOUR + minutes;
    return character.rest(
      hpAfter,
      counterDays,
      new Date().toISOString(),
      summary,
      restPowerPeriods(hours, days),
      poisonRounds,
      input.currentGameDay,
      fatigueMinutes,
    );
  }
}

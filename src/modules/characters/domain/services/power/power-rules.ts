const HOURS_PER_DAY = 24;
const HOURS_PER_PERIOD = 2;
// At most 8 hours of rest a day count (Spell Law 4.1): 4 periods
const PERIODS_PER_DAY = 4;
const PERCENT_PER_PERIOD = 10;

/** Rest periods of 2 complete hours that recover power points: at most 4 a day. */
export function restPowerPeriods(hours: number, days: number): number {
  const wholeDays = days + Math.floor(hours / HOURS_PER_DAY);
  const restHours = hours % HOURS_PER_DAY;
  return wholeDays * PERIODS_PER_DAY + Math.min(PERIODS_PER_DAY, Math.floor(restHours / HOURS_PER_PERIOD));
}

/** Power points recovered resting: 10% of the maximum per period, rounded up (Spell Law 4.1). */
export function restPowerRecovery(max: number, periods: number): number {
  if (max <= 0 || periods <= 0) return 0;
  return Math.ceil((max * periods * PERCENT_PER_PERIOD) / 100);
}

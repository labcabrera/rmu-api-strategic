const HOURS_PER_DAY = 24;
const HOURS_PER_PERIOD = 2;
// At most 8 hours of rest a day count (Spell Law 4.1): 4 periods
const PERIODS_PER_DAY = 4;
// Superior power level; workspace spec 079, E: the game sets it with ppRecoveryPercent (Core Law table 12-1)
const PERCENT_PER_PERIOD = 10;

/**
 * Workspace spec 079, D2 (Core Law ch. 4, sleeper talents): length of a rest period of a character, as a factor of the 2
 * hours. Efficient Sleeper gets the benefit of 4 hours in 3 (I) or 2 (II); Restless Sleeper needs 5 (I) or 6 (II). They
 * change how fast the power points come back, not how many a day: still 4 periods at most.
 */
export const SLEEPER_PERIOD_FACTORS: Record<string, number[]> = {
  'efficient-sleeper': [3 / 4, 1 / 2],
  'restless-sleeper': [5 / 4, 6 / 4],
};

/** Hours of a rest period for the traits (`traitId`, `tier`): 2 without a sleeper talent. Both multiply if present. */
export function restPeriodHours(traits: { traitId: string; tier?: number | null }[] | null | undefined): number {
  let factor = 1;
  Object.entries(SLEEPER_PERIOD_FACTORS).forEach(([traitId, factors]) => {
    const tier = Math.max(0, ...(traits || []).filter(trait => trait.traitId === traitId).map(trait => trait.tier || 1));
    if (tier > 0) factor *= factors[Math.min(tier, factors.length) - 1];
  });
  return HOURS_PER_PERIOD * factor;
}

/**
 * Rest periods of 2 complete hours (`periodHours` for a sleeper talent, spec 079) that recover power points: at most 4
 * a day.
 */
export function restPowerPeriods(hours: number, days: number, periodHours: number = HOURS_PER_PERIOD): number {
  const wholeDays = days + Math.floor(hours / HOURS_PER_DAY);
  const restHours = hours % HOURS_PER_DAY;
  const period = periodHours > 0 ? periodHours : HOURS_PER_PERIOD;
  return wholeDays * PERIODS_PER_DAY + Math.min(PERIODS_PER_DAY, Math.floor(restHours / period + 1e-9));
}

/**
 * Power points recovered resting: `percent` of the maximum per period, rounded up (Spell Law 4.1). 10 by default; the
 * power level of the game sets it (workspace spec 079, E, §12.1: 5 to 25). With at most 4 periods a day the daily
 * maximum is 4 times the percent, also with a sleeper talent, which only changes the length of the periods.
 */
export function restPowerRecovery(max: number, periods: number, percent: number = PERCENT_PER_PERIOD): number {
  if (max <= 0 || periods <= 0 || !(percent > 0)) return 0;
  return Math.ceil((max * periods * percent) / 100);
}

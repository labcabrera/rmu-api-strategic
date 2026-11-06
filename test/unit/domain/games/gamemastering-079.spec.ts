import { startingWealthGold } from '../../../../src/modules/characters/application/services/starting-wealth.service.js';
import {
  restPeriodHours,
  restPowerPeriods,
  restPowerRecovery,
} from '../../../../src/modules/characters/domain/services/power/power-rules.js';
import { GameOptions, resolveOptions } from '../../../../src/modules/games/domain/value-objects/game-options.vo.js';
import {
  GAME_POWER_LEVEL_PRESET_VALUES,
  GAME_POWER_LEVEL_PRESETS,
  resolvePowerLevel,
} from '../../../../src/modules/games/domain/value-objects/game-power-level.vo.js';

// Workspace spec 079, E: chapter 12 (power level presets, power point recovery, starting wealth).
describe('Power level presets (spec 079, E, table 12-1)', () => {
  it('has one preset per power level, rising with the level', () => {
    expect(GAME_POWER_LEVEL_PRESETS).toEqual(['average', 'superior', 'heroic', 'legendary', 'epic']);
    const values = GAME_POWER_LEVEL_PRESETS.map(preset => GAME_POWER_LEVEL_PRESET_VALUES[preset]);
    expect(values.map(v => v.ppRecoveryPercent)).toEqual([5, 10, 15, 20, 25]);
    expect(values.map(v => v.statCreationBoost)).toEqual([1, 2, 3, 4, 5]);
    expect(values.map(v => v.statPoints)).toEqual([5, 15, 25, 35, 45]);
    expect(values.map(v => v.knackCount * v.knackBonus)).toEqual([0, 10, 20, 30, 40]);
  });

  it('defaults to the Superior values, the same ones the client uses', () => {
    const resolved = resolvePowerLevel(undefined);
    const superior = GAME_POWER_LEVEL_PRESET_VALUES.superior;
    expect(resolved).toMatchObject({
      statRandomMin: superior.statRandomMin,
      statBoostTemporary: superior.statBoostTemporary,
      statBoostPotential: superior.statBoostPotential,
      statCreationBoost: superior.statCreationBoost,
      statPoints: superior.statPoints,
      knackCount: superior.knackCount,
      knackBonus: superior.knackBonus,
      ppRecoveryPercent: 10,
      preset: null,
    });
    expect(resolved.statRandomMin).toBe(11);
  });

  it('takes the recovery of the preset when the game does not set it, and the value of the game otherwise', () => {
    expect(resolvePowerLevel({ preset: 'heroic' }).ppRecoveryPercent).toBe(15);
    expect(resolvePowerLevel({ preset: 'heroic', ppRecoveryPercent: 5 }).ppRecoveryPercent).toBe(5);
    expect(resolvePowerLevel({ statRandomMin: 0 }).statRandomMin).toBe(0);
  });
});

describe('Power point recovery by power level (spec 079, E, §12.1)', () => {
  it('recovers the percent of the game every period, rounded up', () => {
    expect(restPowerRecovery(60, 4)).toBe(24);
    expect(restPowerRecovery(60, 4, 5)).toBe(12);
    expect(restPowerRecovery(60, 4, 25)).toBe(60);
    expect(restPowerRecovery(15, 1, 15)).toBe(3);
    expect(restPowerRecovery(60, 4, 0)).toBe(0);
  });

  it('keeps the daily maximum at 4 times the percent with a sleeper talent', () => {
    const efficient = restPeriodHours([{ traitId: 'efficient-sleeper', tier: 2 }]);
    // 4 hours of sleep are already the 4 periods of the day
    expect(restPowerRecovery(100, restPowerPeriods(4, 0, efficient), 20)).toBe(80);
    expect(restPowerRecovery(100, restPowerPeriods(8, 0, efficient), 20)).toBe(80);
    const restless = restPeriodHours([{ traitId: 'restless-sleeper', tier: 2 }]);
    // 8 hours are only 2 periods of 3 hours
    expect(restPowerRecovery(100, restPowerPeriods(8, 0, restless), 20)).toBe(40);
  });
});

describe('Starting wealth (spec 079, E, table 6-0b)', () => {
  const game = (startingWealth?: string) => ({ options: { ...new GameOptions(1, 1, 1, 0), startingWealth } as GameOptions });

  it('is off by default', () => {
    expect(resolveOptions(undefined).startingWealth).toBe('none');
    expect(startingWealthGold(game(), 5)).toBe(0);
    expect(startingWealthGold(game('none'), 5)).toBe(0);
  });

  it('gives the silver pieces of the category per level, in gold pieces', () => {
    expect(startingWealthGold(game('very-poor'), 1)).toBe(0.2);
    expect(startingWealthGold(game('poor'), 3)).toBe(3);
    expect(startingWealthGold(game('modest'), 2)).toBe(4);
    expect(startingWealthGold(game('rich'), 1)).toBe(3);
    expect(startingWealthGold(game('very-rich'), 10)).toBe(50);
  });

  it('gives nothing at level 0, so that no empty stack is made', () => {
    expect(startingWealthGold(game('rich'), 0)).toBe(0);
  });
});

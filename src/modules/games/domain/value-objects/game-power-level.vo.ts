// Defaults of the Superior power level, used when a game does not define the value
export const DEFAULT_MAX_TRAIT_COST = 20;
export const DEFAULT_BASE_DEV_POINTS = 60;
export const DEFAULT_RACE_DEV_POINTS_PER_LEVEL = 25;
export const DEFAULT_CREATION_BONUS_DEV_POINTS = 0;
export const DEFAULT_STAT_POINTS = 15;
export const DEFAULT_KNACK_COUNT = 2;
export const DEFAULT_KNACK_BONUS = 5;
// Workspace spec 079, E: stat rolls under 11 are rolled again, the averages are 56/78 and two stats may take them
export const DEFAULT_STAT_RANDOM_MIN = 11;
export const DEFAULT_STAT_BOOST_TEMPORARY = 56;
export const DEFAULT_STAT_BOOST_POTENTIAL = 78;
export const DEFAULT_STAT_CREATION_BOOST = 2;
export const DEFAULT_STAT_CREATION_SWAP = 2;
// Workspace spec 079, E (§12.1): percent of the power points recovered every rest period of 2 hours
export const DEFAULT_PP_RECOVERY_PERCENT = 10;

/** Power levels of the campaign (Core Law §12.1); the names match the power levels of the alchemy tables. */
export const GAME_POWER_LEVEL_PRESETS = ['average', 'superior', 'heroic', 'legendary', 'epic'] as const;
export type GamePowerLevelPreset = (typeof GAME_POWER_LEVEL_PRESETS)[number];

/** Values of a power level the presets fill (the others, like the development points, are the game master's). */
export interface GamePowerLevelPresetValues {
  statRandomMin: number;
  statBoostTemporary: number;
  statBoostPotential: number;
  statCreationBoost: number;
  statPoints: number;
  knackCount: number;
  knackBonus: number;
  ppRecoveryPercent: number;
}

/**
 * Core Law table 12-1 (workspace spec 079, E). A knack line "+N (+M max)" is N / M knacks of +M; the Average level has
 * none and no rerolls (a minimum of 1).
 */
export const GAME_POWER_LEVEL_PRESET_VALUES: Record<GamePowerLevelPreset, GamePowerLevelPresetValues> = {
  average: {
    statRandomMin: 1,
    statBoostTemporary: 51,
    statBoostPotential: 76,
    statCreationBoost: 1,
    statPoints: 5,
    knackCount: 0,
    knackBonus: 0,
    ppRecoveryPercent: 5,
  },
  superior: {
    statRandomMin: 11,
    statBoostTemporary: 56,
    statBoostPotential: 78,
    statCreationBoost: 2,
    statPoints: 15,
    knackCount: 2,
    knackBonus: 5,
    ppRecoveryPercent: 10,
  },
  heroic: {
    statRandomMin: 21,
    statBoostTemporary: 61,
    statBoostPotential: 81,
    statCreationBoost: 3,
    statPoints: 25,
    knackCount: 2,
    knackBonus: 10,
    ppRecoveryPercent: 15,
  },
  legendary: {
    statRandomMin: 31,
    statBoostTemporary: 66,
    statBoostPotential: 83,
    statCreationBoost: 4,
    statPoints: 35,
    knackCount: 2,
    knackBonus: 15,
    ppRecoveryPercent: 20,
  },
  epic: {
    statRandomMin: 41,
    statBoostTemporary: 71,
    statBoostPotential: 86,
    statCreationBoost: 5,
    statPoints: 45,
    knackCount: 2,
    knackBonus: 20,
    ppRecoveryPercent: 25,
  },
};

export class GamePowerLevel {
  constructor(
    public readonly baseDevPoints: number,
    public readonly statRandomMin: number,
    public readonly statBoostPotential: number,
    public readonly statBoostTemporary: number,
    public readonly statCreationBoost: number,
    public readonly statCreationSwap: number,
    public readonly maxTraitCost?: number,
    // Maximum bonus development points (race and game master) spendable in a single level
    public readonly raceDevPointsPerLevel?: number,
    // Bonus development points granted by the game master, added to the race pool at creation
    public readonly creationBonusDevPoints?: number,
    // Budget of the stat point-buy generation
    public readonly statPoints?: number,
    public readonly knackCount?: number,
    public readonly knackBonus?: number,
    // Workspace spec 079, E: the preset the game master started from (the values stay editable); informative
    public readonly preset?: GamePowerLevelPreset | null,
    // Workspace spec 079, E: percent of the power points recovered every rest period
    public readonly ppRecoveryPercent?: number,
  ) {}
}

export type ResolvedGamePowerLevel = Required<GamePowerLevel>;

// Fills the optional power level values with the Superior defaults. Accepts a missing power level
export const resolvePowerLevel = (powerLevel: Partial<GamePowerLevel> | null | undefined): ResolvedGamePowerLevel => ({
  baseDevPoints: powerLevel?.baseDevPoints || DEFAULT_BASE_DEV_POINTS,
  statRandomMin: powerLevel?.statRandomMin ?? DEFAULT_STAT_RANDOM_MIN,
  statBoostPotential: powerLevel?.statBoostPotential ?? DEFAULT_STAT_BOOST_POTENTIAL,
  statBoostTemporary: powerLevel?.statBoostTemporary ?? DEFAULT_STAT_BOOST_TEMPORARY,
  statCreationBoost: powerLevel?.statCreationBoost ?? DEFAULT_STAT_CREATION_BOOST,
  statCreationSwap: powerLevel?.statCreationSwap ?? DEFAULT_STAT_CREATION_SWAP,
  maxTraitCost: powerLevel?.maxTraitCost ?? DEFAULT_MAX_TRAIT_COST,
  raceDevPointsPerLevel: powerLevel?.raceDevPointsPerLevel ?? DEFAULT_RACE_DEV_POINTS_PER_LEVEL,
  creationBonusDevPoints: powerLevel?.creationBonusDevPoints ?? DEFAULT_CREATION_BONUS_DEV_POINTS,
  statPoints: powerLevel?.statPoints ?? DEFAULT_STAT_POINTS,
  knackCount: powerLevel?.knackCount ?? DEFAULT_KNACK_COUNT,
  knackBonus: powerLevel?.knackBonus ?? DEFAULT_KNACK_BONUS,
  preset: powerLevel?.preset ?? null,
  // A game with a preset and no explicit value recovers as its preset says
  ppRecoveryPercent:
    powerLevel?.ppRecoveryPercent ??
    (powerLevel?.preset ? GAME_POWER_LEVEL_PRESET_VALUES[powerLevel.preset]?.ppRecoveryPercent : undefined) ??
    DEFAULT_PP_RECOVERY_PERCENT,
});

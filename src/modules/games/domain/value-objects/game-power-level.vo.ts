// Defaults of the Superior power level, used when a game does not define the value
export const DEFAULT_MAX_TRAIT_COST = 20;
export const DEFAULT_BASE_DEV_POINTS = 60;
export const DEFAULT_RACE_DEV_POINTS_PER_LEVEL = 25;
export const DEFAULT_CREATION_BONUS_DEV_POINTS = 0;
export const DEFAULT_STAT_POINTS = 15;
export const DEFAULT_KNACK_COUNT = 2;
export const DEFAULT_KNACK_BONUS = 5;

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
  ) {}
}

export type ResolvedGamePowerLevel = Required<GamePowerLevel>;

// Fills the optional power level values with the Superior defaults. Accepts a missing power level
export const resolvePowerLevel = (powerLevel: Partial<GamePowerLevel> | null | undefined): ResolvedGamePowerLevel => ({
  baseDevPoints: powerLevel?.baseDevPoints || DEFAULT_BASE_DEV_POINTS,
  statRandomMin: powerLevel?.statRandomMin ?? 0,
  statBoostPotential: powerLevel?.statBoostPotential ?? 0,
  statBoostTemporary: powerLevel?.statBoostTemporary ?? 0,
  statCreationBoost: powerLevel?.statCreationBoost ?? 0,
  statCreationSwap: powerLevel?.statCreationSwap ?? 0,
  maxTraitCost: powerLevel?.maxTraitCost ?? DEFAULT_MAX_TRAIT_COST,
  raceDevPointsPerLevel: powerLevel?.raceDevPointsPerLevel ?? DEFAULT_RACE_DEV_POINTS_PER_LEVEL,
  creationBonusDevPoints: powerLevel?.creationBonusDevPoints ?? DEFAULT_CREATION_BONUS_DEV_POINTS,
  statPoints: powerLevel?.statPoints ?? DEFAULT_STAT_POINTS,
  knackCount: powerLevel?.knackCount ?? DEFAULT_KNACK_COUNT,
  knackBonus: powerLevel?.knackBonus ?? DEFAULT_KNACK_BONUS,
});

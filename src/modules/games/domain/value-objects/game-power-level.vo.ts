// Maximum development points for a single talent at the Superior power level
export const DEFAULT_MAX_TRAIT_COST = 20;

export class GamePowerLevel {
  constructor(
    public readonly baseDevPoints: number,
    public readonly statRandomMin: number,
    public readonly statBoostPotential: number,
    public readonly statBoostTemporary: number,
    public readonly statCreationBoost: number,
    public readonly statCreationSwap: number,
    public readonly maxTraitCost?: number,
  ) {}
}

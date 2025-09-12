export class GamePowerLevel {
  constructor(
    public readonly baseDevPoints: number,
    public readonly statRandomMin: number,
    public readonly statBoostPotential: number,
    public readonly statBoostTemporary: number,
    public readonly statCreationBoost: number,
    public readonly statCreationSwap: number,
  ) {}
}

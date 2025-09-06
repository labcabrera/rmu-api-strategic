export type GameStatus = 'open' | 'closed';

export interface Game {
  id: string;
  name: string;
  realm: string;
  status: GameStatus;
  options: GameOptions;
  powerLevel: GamePowerLevel;
  description: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface GameOptions {
  experienceMultiplier: number;
  fatigueMultiplier: number;
  boardScaleMultiplier: number;
  letality: number;
}

export interface GamePowerLevel {
  baseDevPoints: number;
  statRandomMin: number;
  statBoostPotential: number;
  statBoostTemporary: number;
  statCreationBoost: number;
  statCreationSwap: number;
}

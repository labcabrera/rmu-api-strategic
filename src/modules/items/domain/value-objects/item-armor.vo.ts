import { Difficulty } from '../../../characters/domain/value-objects/difficulty.vo';

export class ItemArmor {
  constructor(
    public readonly slot: string,
    public readonly at: number,
    public readonly enc: number,
    public readonly maneuverPenalty: number,
    public readonly rangedPenalty: number,
    public readonly perceptionPenalty: number,
    public readonly baseDifficulty: Difficulty,
  ) {}
}

import { AggregateRoot } from '@nestjs/cqrs';
import { GameOptions } from './game-options.vo';
import { GamePowerLevel } from './game-power-level.vo';
import { GameStatus } from './game-status.vo';

export class Game extends AggregateRoot {
  constructor(
    public readonly id: string,
    public name: string,
    public realm: string,
    public status: GameStatus,
    public options: GameOptions,
    public powerLevel: GamePowerLevel,
    public description: string | undefined,
    public owner: string,
    public createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }
}

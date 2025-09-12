import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { GameCreatedEvent, GameUpdatedEvent } from '../events/game.events';
import { GameOptions } from '../value-objects/game-options.vo';
import { GamePowerLevel } from '../value-objects/game-power-level.vo';
import { GameStatus } from '../value-objects/game-status.vo';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

export class Game extends AggregateRoot<DomainEvent<Game>> {
  constructor(
    public readonly id: string,
    public name: string,
    public realm: string,
    public status: GameStatus,
    public options: GameOptions,
    public powerLevel: GamePowerLevel,
    public description: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }

  static create(
    name: string,
    realm: string,
    options: GameOptions,
    powerLevel: GamePowerLevel,
    description: string | undefined,
    owner: string,
  ): Game {
    const game = new Game(
      randomUUID(),
      name,
      realm,
      'open',
      options,
      powerLevel,
      description,
      owner,
      new Date(),
      undefined,
    );
    game.apply(new GameCreatedEvent(game));
    return game;
  }

  update(
    name: string | undefined,
    options: GameOptions | undefined,
    powerLevel: GamePowerLevel | undefined,
    description: string | undefined,
  ): void {
    if (name) this.name = name;
    if (options) this.options = options;
    if (powerLevel) this.powerLevel = powerLevel;
    if (description) this.description = description;
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }
}

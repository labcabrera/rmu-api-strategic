import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { GameCreatedEvent, GameUpdatedEvent } from '../events/game.events';
import { GameOptions } from '../value-objects/game-options.vo';
import { GamePowerLevel } from '../value-objects/game-power-level.vo';
import { GameStatus } from '../value-objects/game-status.vo';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

export interface GameProps {
  id: string;
  name: string;
  realmId: string;
  realmName: string;
  status: GameStatus;
  options: GameOptions;
  powerLevel: GamePowerLevel;
  description?: string;
  owner: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class Game extends AggregateRoot<DomainEvent<Game>> {
  private constructor(
    public readonly id: string,
    public name: string,
    public realmId: string,
    public realmName: string,
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
    realmId: string,
    realmName: string,
    options: GameOptions,
    powerLevel: GamePowerLevel,
    description: string | undefined,
    owner: string,
  ): Game {
    const game = new Game(
      randomUUID(),
      name,
      realmId,
      realmName,
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

  static fromProps(props: GameProps): Game {
    return new Game(
      props.id,
      props.name,
      props.realmId,
      props.realmName,
      props.status,
      props.options,
      props.powerLevel,
      props.description,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
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

  toProps(): GameProps {
    return {
      id: this.id,
      name: this.name,
      realmId: this.realmId,
      realmName: this.realmName,
      status: this.status,
      options: this.options,
      powerLevel: this.powerLevel,
      description: this.description,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

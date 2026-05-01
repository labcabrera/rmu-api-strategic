import { randomUUID } from 'crypto';
import { GameCreatedEvent, GameUpdatedEvent } from '../events/game.events';
import { GameOptions } from '../value-objects/game-options.vo';
import { GamePowerLevel } from '../value-objects/game-power-level.vo';
import { GameStatus } from '../value-objects/game-status.vo';
import { BaseAggregateRoot } from 'src/modules/shared/domain/aggregates/base-aggregate';
import { CreateGameProps, GameProps, UpdateGameProps } from './game-props';
import { AccessType } from 'src/modules/shared/domain/entities/access-type';

export class Game extends BaseAggregateRoot<GameProps> {
  private constructor(
    id: string,
    public name: string,
    public realmId: string,
    public realmName: string,
    public status: GameStatus,
    public options: GameOptions,
    public powerLevel: GamePowerLevel,
    public shortDescription: string | undefined,
    public description: string | undefined,
    public imageUrl: string | undefined,
    public owner: string,
    public accessType: AccessType,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super(id);
  }

  static create(props: CreateGameProps): Game {
    const game = new Game(
      randomUUID(),
      props.name,
      props.realmId,
      props.realmName,
      'open',
      props.options,
      props.powerLevel,
      props.shortDescription,
      props.description,
      props.imageUrl,
      props.owner,
      props.accessType,
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
      props.shortDescription,
      props.description,
      props.imageUrl,
      props.owner,
      props.accessType,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(props: UpdateGameProps): void {
    const { name, options, powerLevel, shortDescription, description, imageUrl } = props;
    if (name) this.name = name;
    if (options) this.options = options;
    if (powerLevel) this.powerLevel = powerLevel;
    if (shortDescription) this.shortDescription = shortDescription;
    if (description) this.description = description;
    if (imageUrl) this.imageUrl = imageUrl;
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  getProps(): GameProps {
    return {
      id: this.id,
      name: this.name,
      realmId: this.realmId,
      realmName: this.realmName,
      status: this.status,
      options: this.options,
      powerLevel: this.powerLevel,
      shortDescription: this.shortDescription,
      description: this.description,
      imageUrl: this.imageUrl,
      owner: this.owner,
      accessType: this.accessType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

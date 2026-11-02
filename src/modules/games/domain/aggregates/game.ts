import { randomUUID } from 'crypto';
import { GameCreatedEvent, GameUpdatedEvent } from '../events/game.events.js';
import { GameCalendar, resolveCalendar } from '../value-objects/game-calendar.vo.js';
import { GameOptions } from '../value-objects/game-options.vo.js';
import { GamePowerLevel } from '../value-objects/game-power-level.vo.js';
import type { GameStatus } from '../value-objects/game-status.vo.js';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import type { CreateGameProps, GameProps, UpdateGameProps } from './game-props.js';
import type { AccessType } from '../../../shared/domain/entities/access-type.js';

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
    public calendar: GameCalendar,
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
      GameCalendar.empty().adjust(props.calendar?.startDate, 0),
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
      resolveCalendar(props.calendar),
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

  /**
   * Corrects the calendar by hand (spec 065, decision 6): it applies no effects. Returns whether the counter of days
   * changed, which leaves an `adjust` entry in the time log.
   */
  adjustCalendar(startDate: string | undefined, elapsedDays: number | undefined): { changed: boolean; fromDay: number; toDay: number } {
    const before = this.calendar;
    const after = before.adjust(startDate, elapsedDays);
    if (after.equals(before)) return { changed: false, fromDay: before.currentDay, toDay: before.currentDay };
    this.calendar = after;
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
    return { changed: after.elapsedDays !== before.elapsedDays, fromDay: before.currentDay, toDay: after.currentDay };
  }

  /** Time passes (spec 065): the counter moves on; the effects on the characters are applied by the caller. */
  passTime(days: number, hours: number): { fromDay: number; toDay: number } {
    const fromDay = this.calendar.currentDay;
    this.calendar = this.calendar.advance(days, hours);
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
    return { fromDay, toDay: this.calendar.currentDay };
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
      calendar: this.calendar,
    };
  }
}

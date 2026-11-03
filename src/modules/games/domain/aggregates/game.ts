import { randomUUID } from 'crypto';
import { GameCreatedEvent, GameUpdatedEvent } from '../events/game.events.js';
import { GameCalendar, resolveCalendar } from '../value-objects/game-calendar.vo.js';
import { GameOptions } from '../value-objects/game-options.vo.js';
import { GamePowerLevel } from '../value-objects/game-power-level.vo.js';
import type { GameStatus } from '../value-objects/game-status.vo.js';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import type { CreateGameProps, GameProps, UpdateGameProps } from './game-props.js';
import type { AccessType } from '../../../shared/domain/entities/access-type.js';
import { ConflictError, ValidationError } from '../../../shared/domain/errors/errors.js';
import {
  type GameJoinRequest,
  type GameMember,
  type GameMemberRole,
  MAX_GAME_JOIN_REQUESTS,
  MAX_GAME_MEMBERS,
} from '../value-objects/game-member.vo.js';

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
    public members: GameMember[] = [],
    public joinRequests: GameJoinRequest[] = [],
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
      (props.members ?? []).map(member => ({ ...member })),
      (props.joinRequests ?? []).map(request => ({ ...request })),
    );
  }

  /** The role of a member, or null for the owner and for anybody else. */
  roleOf(userId: string): GameMemberRole | null {
    return this.members.find(member => member.userId === userId)?.role ?? null;
  }

  /**
   * Adds a member or changes their role (spec 071, decision 4). It also takes the user out of the join requests. The
   * caller checks who may do it and that the user is a friend of the owner.
   */
  setMember(userId: string, userName: string, role: GameMemberRole): void {
    if (userId === this.owner) throw new ValidationError('The owner of the game is not a member', 'member-owner');
    const current = this.members.find(member => member.userId === userId);
    if (current) {
      if (current.role === role && current.userName === userName) return;
      this.members = this.members.map(member => (member.userId === userId ? { ...member, userName, role } : member));
    } else {
      if (this.members.length >= MAX_GAME_MEMBERS) {
        throw new ConflictError(`A game has at most ${MAX_GAME_MEMBERS} members`, 'member-limit');
      }
      this.members = [...this.members, { userId, userName, role, joinedAt: new Date() }];
    }
    this.joinRequests = this.joinRequests.filter(request => request.userId !== userId);
    this.changed();
  }

  /** Takes a member out (they leave, or a master expels them). Their characters stay in the game (decision 5). */
  removeMember(userId: string): void {
    if (!this.members.some(member => member.userId === userId)) return;
    this.members = this.members.filter(member => member.userId !== userId);
    this.changed();
  }

  /** A request to join a public game; asking again changes the message. */
  requestJoin(userId: string, userName: string, message: string | null): void {
    if (this.accessType !== 'public') throw new ValidationError('Only public games take join requests', 'game-not-public');
    if (userId === this.owner || this.roleOf(userId)) throw new ConflictError('Already a member of the game', 'already-member');
    const current = this.joinRequests.find(request => request.userId === userId);
    if (current) {
      this.joinRequests = this.joinRequests.map(request => (request.userId === userId ? { ...request, userName, message } : request));
    } else {
      if (this.joinRequests.length >= MAX_GAME_JOIN_REQUESTS) {
        throw new ConflictError(`A game has at most ${MAX_GAME_JOIN_REQUESTS} join requests`, 'join-request-limit');
      }
      this.joinRequests = [...this.joinRequests, { userId, userName, message, requestedAt: new Date() }];
    }
    this.changed();
  }

  joinRequestOf(userId: string): GameJoinRequest | null {
    return this.joinRequests.find(request => request.userId === userId) ?? null;
  }

  /** Rejects a join request, or the user takes it back. Without a request it changes nothing. */
  removeJoinRequest(userId: string): void {
    if (!this.joinRequests.some(request => request.userId === userId)) return;
    this.joinRequests = this.joinRequests.filter(request => request.userId !== userId);
    this.changed();
  }

  private changed(): void {
    this.updatedAt = new Date();
    this.apply(new GameUpdatedEvent(this));
  }

  update(props: UpdateGameProps): void {
    const { name, options, powerLevel, shortDescription, description, imageUrl, accessType } = props;
    if (name) this.name = name;
    if (options) this.options = options;
    if (powerLevel) this.powerLevel = powerLevel;
    if (shortDescription) this.shortDescription = shortDescription;
    if (description) this.description = description;
    if (imageUrl) this.imageUrl = imageUrl;
    if (accessType && accessType !== this.accessType) {
      this.accessType = accessType;
      // A private game takes no join requests (spec 071).
      if (accessType === 'private') this.joinRequests = [];
    }
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
      members: this.members,
      joinRequests: this.joinRequests,
    };
  }
}

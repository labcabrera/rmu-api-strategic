import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import type { GameJoinRequest, GameMember } from '../../../domain/value-objects/game-member.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { type UsersClientPort, USERS_CLIENT } from '../../ports/users-client.port.js';
import { GameAccess } from '../../services/game-access.service.js';
import {
  ApproveJoinRequestCommand,
  RemoveGameMemberCommand,
  RemoveJoinRequestCommand,
  RequestJoinGameCommand,
  SetGameMemberCommand,
} from '../commands/game-members.commands.js';
import { GetGameMembersQuery } from '../queries/game-members.queries.js';

/** The members of a game, and its join requests for its masters (spec 071). */
export type GameMembersView = { members: GameMember[]; joinRequests: GameJoinRequest[] | null };

/** Loads a game, applies a change and stores it with its event (core follows the members to share the realm). */
abstract class GameMembersHandler {
  constructor(
    protected readonly games: GameRepository,
    protected readonly gameAccess: GameAccess,
    protected readonly events: DomainEventPublisher,
  ) {}

  protected async load(gameId: string): Promise<Game> {
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundError('Game', gameId);
    return game;
  }

  protected async store(game: Game): Promise<Game> {
    if (!game.hasChanges()) return game;
    const updated = await this.games.update(game);
    await this.events.publishChanges('game', game);
    return updated;
  }
}

@CommandHandler(SetGameMemberCommand)
export class SetGameMemberHandler extends GameMembersHandler implements ICommandHandler<SetGameMemberCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) games: GameRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
    @Inject(USERS_CLIENT) private readonly users: UsersClientPort,
  ) {
    super(games, gameAccess, events);
  }

  async execute(command: SetGameMemberCommand): Promise<Game> {
    const game = await this.load(command.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the members of this game');
    const current = game.roleOf(command.memberId);
    // Co-masters are the owner's business (decision 4).
    if (command.role === 'master' || current === 'master') {
      this.gameAccess.checkOwner(game, command.userId, command.roles, 'the co-masters of this game');
    }
    let userName = game.members.find(member => member.userId === command.memberId)?.userName;
    if (!userName && GameAccess.isAdmin(command.roles)) {
      // An admin adds anybody with a profile (decision 15).
      userName = (await this.users.findUserName(command.memberId)) ?? undefined;
      if (!userName) throw new ValidationError('The user has no RMU profile');
    }
    if (!userName) {
      const friend = await this.users.findAcceptedFriend(game.owner, command.memberId);
      if (!friend) throw new ValidationError('Only friends of the owner join the game', 'not-a-friend');
      userName = friend.userName;
    }
    game.setMember(command.memberId, userName, command.role);
    return this.store(game);
  }
}

@CommandHandler(RemoveGameMemberCommand)
export class RemoveGameMemberHandler extends GameMembersHandler implements ICommandHandler<RemoveGameMemberCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) games: GameRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
  ) {
    super(games, gameAccess, events);
  }

  async execute(command: RemoveGameMemberCommand): Promise<Game> {
    const game = await this.load(command.gameId);
    if (command.memberId !== command.userId) {
      this.gameAccess.checkManage(game, command.userId, command.roles, 'the members of this game');
      if (game.roleOf(command.memberId) === 'master') {
        this.gameAccess.checkOwner(game, command.userId, command.roles, 'the co-masters of this game');
      }
    } else if (!game.roleOf(command.userId)) {
      throw new NotFoundError('Game member', command.memberId);
    }
    game.removeMember(command.memberId);
    return this.store(game);
  }
}

@CommandHandler(RequestJoinGameCommand)
export class RequestJoinGameHandler extends GameMembersHandler implements ICommandHandler<RequestJoinGameCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) games: GameRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
    @Inject(USERS_CLIENT) private readonly users: UsersClientPort,
  ) {
    super(games, gameAccess, events);
  }

  async execute(command: RequestJoinGameCommand): Promise<Game> {
    GameAccess.checkCreateRole(command.roles, 'join requests');
    const game = await this.load(command.gameId);
    // A private game is not even seen by who is not a member.
    if (!this.gameAccess.canReadCover(game, command.userId, command.roles)) throw new NotFoundError('Game', command.gameId);
    const userName = await this.users.findUserName(command.userId);
    if (!userName) throw new ValidationError('The user has no RMU profile');
    game.requestJoin(command.userId, userName, command.message?.trim() || null);
    return this.store(game);
  }
}

@CommandHandler(ApproveJoinRequestCommand)
export class ApproveJoinRequestHandler extends GameMembersHandler implements ICommandHandler<ApproveJoinRequestCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) games: GameRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
  ) {
    super(games, gameAccess, events);
  }

  async execute(command: ApproveJoinRequestCommand): Promise<Game> {
    const game = await this.load(command.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the members of this game');
    const request = game.joinRequestOf(command.requesterId);
    if (!request) throw new NotFoundError('Join request', command.requesterId);
    game.setMember(request.userId, request.userName, 'player');
    return this.store(game);
  }
}

@CommandHandler(RemoveJoinRequestCommand)
export class RemoveJoinRequestHandler extends GameMembersHandler implements ICommandHandler<RemoveJoinRequestCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) games: GameRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
  ) {
    super(games, gameAccess, events);
  }

  async execute(command: RemoveJoinRequestCommand): Promise<Game> {
    const game = await this.load(command.gameId);
    if (command.requesterId !== command.userId) {
      this.gameAccess.checkManage(game, command.userId, command.roles, 'the join requests of this game');
    }
    game.removeJoinRequest(command.requesterId);
    return this.store(game);
  }
}

@QueryHandler(GetGameMembersQuery)
export class GetGameMembersHandler implements IQueryHandler<GetGameMembersQuery, GameMembersView> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(query: GetGameMembersQuery): Promise<GameMembersView> {
    const game = await this.games.findById(query.gameId);
    if (!game) throw new NotFoundError('Game', query.gameId);
    if (!(await this.gameAccess.canRead(game, query.userId, query.roles))) {
      // A public game shows its members to nobody outside it; a user still sees their own join request.
      if (!this.gameAccess.canReadCover(game, query.userId, query.roles)) throw new NotFoundError('Game', query.gameId);
      const own = game.joinRequestOf(query.userId);
      if (!own) throw new ForbiddenError('You do not have permission to read the members of this game');
      return { members: [], joinRequests: [own] };
    }
    const masters = this.gameAccess.canManage(game, query.userId, query.roles);
    return { members: game.members, joinRequests: masters ? game.joinRequests : null };
  }
}

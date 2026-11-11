import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { GameMemberRole } from '../../../domain/value-objects/game-member.vo.js';

/** Adds a friend of the owner to the game, or changes the role of a member (spec 071, decision 4). */
export class SetGameMemberCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly memberId: string,
    public readonly role: GameMemberRole,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** A member leaves (memberId is the user) or a master expels them (decision 5). */
export class RemoveGameMemberCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly memberId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class RequestJoinGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly message: string | null,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

export class ApproveJoinRequestCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly requesterId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** A master rejects a join request, or its user takes it back. */
export class RemoveJoinRequestCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly requesterId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { type UsersClientPort, USERS_CLIENT } from '../../../../games/application/ports/users-client.port.js';
import type { Game } from '../../../../games/domain/aggregates/game.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Faction } from '../../../domain/aggregates/faction.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { FactionAccess } from '../../services/faction-access.service.js';
import { AddFactionPlayerCommand, RemoveFactionPlayerCommand, SyncFactionPlayersCommand } from '../commands/faction-players.commands.js';

const notAPlayer = () => new ValidationError('The players of a faction must be players of the game', 'faction-player-not-a-player');

/** Loads the faction and its game, and stores the faction with its event (tactical follows its players). */
abstract class FactionPlayersHandler {
  constructor(
    protected readonly factions: FactionRepository,
    protected readonly gameAccess: GameAccess,
    protected readonly events: DomainEventPublisher,
  ) {}

  protected async load(factionId: string): Promise<{ faction: Faction; game: Game }> {
    const faction = await this.factions.findById(factionId);
    if (!faction) throw new NotFoundError('Faction', factionId, 'err-faction-not-found');
    const game = await this.gameAccess.findGame(faction.gameId);
    if (!game) throw new NotFoundError('Game', faction.gameId, 'err-game-not-found');
    return { faction, game };
  }

  protected async store(faction: Faction): Promise<Faction> {
    if (!faction.hasChanges()) return faction;
    const updated = await this.factions.update(faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }
}

/**
 * Spec 072, decision 5: a master adds any player of the game; a player of the faction adds a friend of theirs, who
 * joins the game as a player when they are not a member yet (with the member limit of spec 071).
 */
@CommandHandler(AddFactionPlayerCommand)
export class AddFactionPlayerHandler extends FactionPlayersHandler implements ICommandHandler<AddFactionPlayerCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) factions: FactionRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
    private readonly factionAccess: FactionAccess,
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(USERS_CLIENT) private readonly users: UsersClientPort,
  ) {
    super(factions, gameAccess, events);
  }

  async execute(command: AddFactionPlayerCommand): Promise<Faction> {
    const { faction, game } = await this.load(command.factionId);
    if (this.gameAccess.canManage(game, command.userId, command.roles)) {
      if (game.roleOf(command.playerId) !== 'player') throw notAPlayer();
    } else {
      await this.factionAccess.checkWrite(faction, command.userId, command.roles);
      const friend = await this.users.findAcceptedFriend(command.userId, command.playerId);
      if (!friend) throw new ValidationError('Players add their friends to their faction', 'not-a-friend');
      const role = game.roleOf(command.playerId);
      if (role === null && command.playerId !== game.owner) {
        game.setMember(command.playerId, friend.userName, 'player');
        await this.games.update(game);
        await this.events.publishChanges('game', game);
      } else if (role !== 'player') {
        throw notAPlayer();
      }
    }
    faction.addPlayer(command.playerId);
    return this.store(faction);
  }
}

/** Spec 072, decision 5: a master takes out anybody; a player of the faction only leaves it. */
@CommandHandler(RemoveFactionPlayerCommand)
export class RemoveFactionPlayerHandler extends FactionPlayersHandler implements ICommandHandler<RemoveFactionPlayerCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) factions: FactionRepository,
    gameAccess: GameAccess,
    @Inject(DOMAIN_EVENT_PUBLISHER) events: DomainEventPublisher,
  ) {
    super(factions, gameAccess, events);
  }

  async execute(command: RemoveFactionPlayerCommand): Promise<Faction> {
    const { faction, game } = await this.load(command.factionId);
    if (command.playerId !== command.userId && !this.gameAccess.canManage(game, command.userId, command.roles)) {
      throw new ForbiddenError('Only the masters take other players out of a faction', 'not-a-faction-player');
    }
    if (!faction.isPlayer(command.playerId)) throw new NotFoundError('Faction player', command.playerId);
    faction.removePlayer(command.playerId);
    return this.store(faction);
  }
}

/** Spec 072, decision 9: whoever is no longer a player of the game leaves its factions. Idempotent. */
@CommandHandler(SyncFactionPlayersCommand)
export class SyncFactionPlayersHandler implements ICommandHandler<SyncFactionPlayersCommand, void> {
  private readonly logger = new Logger(SyncFactionPlayersHandler.name);

  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factions: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: SyncFactionPlayersCommand): Promise<void> {
    const players = new Set(command.playerIds);
    for (const faction of await this.factions.findByGameId(command.gameId)) {
      const kept = faction.players.filter(id => players.has(id));
      if (kept.length === faction.players.length) continue;
      this.logger.log(`Faction ${faction.id}: ${faction.players.length - kept.length} players left the game`);
      faction.setPlayers(kept);
      await this.factions.update(faction);
      await this.events.publishChanges('faction', faction);
    }
  }
}

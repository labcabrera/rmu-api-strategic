import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Faction } from '../../../domain/aggregates/faction.js';
import type { Game } from '../../../../games/domain/aggregates/game.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { UpdateFactionCommand } from '../commands/update-faction.command.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { FactionNpcsResolver } from '../../services/faction-npcs.resolver.js';
import { FactionAccess } from '../../services/faction-access.service.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateFactionCommand)
export class UpdateFactionHandler implements ICommandHandler<UpdateFactionCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
    private readonly npcsResolver: FactionNpcsResolver,
    private readonly factionAccess: FactionAccess,
  ) {}

  async execute(command: UpdateFactionCommand): Promise<Faction> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);
    const game = await this.gameAccess.findGame(faction.gameId);
    // Spec 072, decision 6: its players change its descriptions and image; its name, NPCs and players are the masters'.
    const mastersOnly =
      (command.name !== undefined && command.name !== faction.name) || command.npcs !== undefined || command.players !== undefined;
    if (mastersOnly) this.gameAccess.checkManage(game, command.userId, command.roles, 'this faction');
    else await this.factionAccess.checkWrite(faction, command.userId, command.roles);

    faction.checkVersion(command.expectedVersion);

    // Spec 055: the NPCs are checked against rmu-api-npcs and core for the owner of the faction and its campaign
    const npcs = command.npcs ? await this.resolveNpcs(command, faction, game) : undefined;

    faction.update({
      name: command.name,
      shortDescription: command.shortDescription,
      description: command.description,
      imageUrl: command.imageUrl,
      npcs,
    });
    if (command.players !== undefined) faction.setPlayers(this.checkPlayers(game, command.players));
    // Spec 021, decision 9: a PATCH without changes neither writes nor publishes.
    if (!faction.hasChanges()) return faction;
    const updated = await this.factionRepository.update(faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }

  /** Spec 072, decision 5: every player of a faction is a player of the game. */
  private checkPlayers(game: Game | null, players: string[]): string[] {
    for (const player of players) {
      if (game?.roleOf(player) !== 'player') {
        throw new ValidationError('The players of a faction must be players of the game', 'faction-player-not-a-player');
      }
    }
    return players;
  }

  private resolveNpcs(command: UpdateFactionCommand, faction: Faction, game: Game | null) {
    if (!game) throw new NotFoundError('Strategic game', faction.gameId);
    return this.npcsResolver.resolve(command.npcs!, { owner: faction.owner, realmId: game.realmId });
  }
}

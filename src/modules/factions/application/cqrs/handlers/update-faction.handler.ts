import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Faction } from '../../../domain/aggregates/faction.js';
import type { Game } from '../../../../games/domain/aggregates/game.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { UpdateFactionCommand } from '../commands/update-faction.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { FactionNpcsResolver } from '../../services/faction-npcs.resolver.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateFactionCommand)
export class UpdateFactionHandler implements ICommandHandler<UpdateFactionCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
    private readonly npcsResolver: FactionNpcsResolver,
  ) {}

  async execute(command: UpdateFactionCommand): Promise<Faction> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);
    const game = await this.gameAccess.findGame(faction.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'this faction');

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
    // Spec 021, decision 9: a PATCH without changes neither writes nor publishes.
    if (!faction.hasChanges()) return faction;
    const updated = await this.factionRepository.update(faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }

  private resolveNpcs(command: UpdateFactionCommand, faction: Faction, game: Game | null) {
    if (!game) throw new NotFoundError('Strategic game', faction.gameId);
    return this.npcsResolver.resolve(command.npcs!, { owner: faction.owner, realmId: game.realmId });
  }
}

import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Faction } from '../../../domain/aggregates/faction.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { AddFactionXPCommand } from '../commands/add-faction-xp.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddFactionXPCommand)
export class AddFactionXPCommandHandler implements ICommandHandler<AddFactionXPCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(command: AddFactionXPCommand): Promise<Faction> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);
    // The owner of the game or an admin (F-strategic-18: no faction-management role).
    const game = await this.gameAccess.findGame(faction.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the XP of this faction');

    faction.addXp(command.xp);
    const updated = await this.factionRepository.update(faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }
}

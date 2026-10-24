import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Faction } from '../../../domain/aggregates/faction.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { AddFactionGoldCommand } from '../commands/add-faction-gold.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(AddFactionGoldCommand)
export class AddFactionGoldCommandHandler implements ICommandHandler<AddFactionGoldCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(command: AddFactionGoldCommand): Promise<Faction> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);
    // The owner of the game or an admin, in both directions (F-strategic-18: no faction-management role).
    const game = await this.gameAccess.findGame(faction.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the gold of this faction');
    faction.addGold(command.gold);
    const updated = await this.factionRepository.update(faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }
}

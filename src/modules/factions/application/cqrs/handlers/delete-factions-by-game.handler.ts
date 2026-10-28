import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeleteFactionsByGameCommand } from '../commands/delete-factions-by-game.command.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { FactionDeletedEvent } from '../../../domain/events/faction.events.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Deletes the factions of a deleted game through the repository, one at a time, publishing a faction.deleted per
 * faction like DeleteFactionCommandHandler. Idempotent: a repeated message no longer finds any faction.
 */
@CommandHandler(DeleteFactionsByGameCommand)
export class DeleteFactionsByGameHandler implements ICommandHandler<DeleteFactionsByGameCommand, void> {
  private readonly logger = new Logger(DeleteFactionsByGameHandler.name);

  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: DeleteFactionsByGameCommand): Promise<void> {
    const factions = await this.factionRepository.findByGameId(command.gameId);
    this.logger.log(`Deleting ${factions.length} factions of game ${command.gameId}`);
    for (const faction of factions) {
      await this.factionRepository.deleteById(faction.id);
      await this.events.publish('faction', new FactionDeletedEvent(faction));
    }
  }
}

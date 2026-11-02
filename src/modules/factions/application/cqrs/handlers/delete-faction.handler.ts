import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { FactionDeletedEvent } from '../../../domain/events/faction.events.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port.js';
import { DeleteFactionCommand } from '../commands/delete-faction.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(DeleteFactionCommand)
export class DeleteFactionCommandHandler implements ICommandHandler<DeleteFactionCommand> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(command: DeleteFactionCommand): Promise<void> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) {
      throw new NotFoundError('Faction', command.factionId);
    }
    this.gameAccess.checkManage(await this.gameAccess.findGame(faction.gameId), command.userId, command.roles, 'this faction');
    //TODO delete characters
    await this.factionRepository.deleteById(command.factionId);
    await this.events.publish('faction', new FactionDeletedEvent(faction));
  }
}

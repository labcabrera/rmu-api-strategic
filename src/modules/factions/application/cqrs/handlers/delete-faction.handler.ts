import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FactionDeletedEvent } from '../../../domain/events/faction.events';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port';
import { DeleteFactionCommand } from '../commands/delete-faction.command';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(DeleteFactionCommand)
export class DeleteFactionCommandHandler implements ICommandHandler<DeleteFactionCommand> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: DeleteFactionCommand): Promise<void> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) {
      throw new NotFoundError('Faction', command.factionId);
    }
    //TODO delete characters
    await this.factionRepository.deleteById(command.factionId);
    await this.events.publish('faction', new FactionDeletedEvent(faction));
  }
}

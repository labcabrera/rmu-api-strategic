import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from '../../../domain/aggregates/faction';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port';
import { UpdateFactionCommand } from '../commands/update-faction.command';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(UpdateFactionCommand)
export class UpdateFactionHandler implements ICommandHandler<UpdateFactionCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: UpdateFactionCommand): Promise<Faction> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);

    faction.update({
      name: command.name,
      management: command.management,
      shortDescription: command.shortDescription,
      description: command.description,
      imageUrl: command.imageUrl,
    });
    const updated = await this.factionRepository.update(command.factionId, faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }
}

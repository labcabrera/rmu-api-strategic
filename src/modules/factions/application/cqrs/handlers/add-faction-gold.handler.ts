import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from '../../../domain/aggregates/faction';
import { type FactionRepository, FACTION_REPOSITORY } from '../../ports/faction-repository.port';
import { AddFactionGoldCommand } from '../commands/add-faction-gold.command';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/errors';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(AddFactionGoldCommand)
export class AddFactionGoldCommandHandler implements ICommandHandler<AddFactionGoldCommand, Faction> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: AddFactionGoldCommand): Promise<Faction> {
    if (!command.roles.includes('faction-management') && command.gold > 0) {
      throw new ForbiddenError('You do not have permission to add gold to this faction. Required faction-management role.');
    }
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);
    faction.addGold(command.gold);
    const updated = await this.factionRepository.update(command.factionId, faction);
    await this.events.publishChanges('faction', faction);
    return updated;
  }
}

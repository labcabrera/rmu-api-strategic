import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { AddFactionXPCommand } from '../commands/add-faction-xp.command';
import { ForbiddenError, NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(AddFactionXPCommand)
export class AddFactionXPCommandHandler implements ICommandHandler<AddFactionXPCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('FactionEventProducer') private readonly factionEventBus: FactionEventBusPort,
  ) {}

  async execute(command: AddFactionXPCommand): Promise<Faction> {
    if (!command.roles.includes('faction-management')) {
      throw new ForbiddenError(
        'You do not have permission to add XP to this faction. Required faction-management role.',
      );
    }
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);

    faction.addXp(command.xp);
    const updated = await this.factionRepository.update(command.factionId, faction);
    faction.getUncommittedEvents().forEach((event) => this.factionEventBus.publish(event));
    return updated;
  }
}

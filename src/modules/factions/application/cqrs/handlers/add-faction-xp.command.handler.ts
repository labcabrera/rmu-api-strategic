import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { ForbiddenError, NotFoundError } from 'src/modules/shared/domain/errors';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { AddFactionXPCommand } from '../commands/add-faction-xp.command';

@CommandHandler(AddFactionXPCommand)
export class AddFactionXPCommandHandler implements ICommandHandler<AddFactionXPCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: FactionEventBusPort,
  ) {}

  async execute(command: AddFactionXPCommand): Promise<Faction> {
    if (!command.roles.includes('faction-management')) {
      throw new ForbiddenError(
        'You do not have permission to add XP to this faction. Required faction-management role.',
      );
    }
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) {
      throw new NotFoundError('Faction', command.factionId);
    }
    faction.management.availableXP += command.xp;
    const updated = await this.factionRepository.update(command.factionId, faction);
    await this.factionNotificationPort.updated(updated);
    return updated;
  }
}

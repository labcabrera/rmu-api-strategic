import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { AddFactionGoldCommand } from '../commands/add-faction-gold.command';
import { ForbiddenError, NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(AddFactionGoldCommand)
export class AddFactionGoldCommandHandler implements ICommandHandler<AddFactionGoldCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('FactionEventProducer') private readonly factionEventBus: FactionEventBusPort,
  ) {}

  async execute(command: AddFactionGoldCommand): Promise<Faction> {
    if (!command.roles.includes('faction-management') && command.gold > 0) {
      throw new ForbiddenError('You do not have permission to add gold to this faction. Required faction-management role.');
    }
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId);
    faction.addGold(command.gold);
    const updated = await this.factionRepository.update(command.factionId, faction);
    faction.getUncommittedEvents().forEach(event => this.factionEventBus.publish(event));
    return updated;
  }
}

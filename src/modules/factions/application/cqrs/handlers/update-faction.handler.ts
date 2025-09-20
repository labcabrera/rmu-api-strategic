import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { UpdateFactionCommand } from '../commands/update-faction.command';

@CommandHandler(UpdateFactionCommand)
export class UpdateFactionHandler implements ICommandHandler<UpdateFactionCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('FactionEventProducer') private readonly factionEventBus: FactionEventBusPort,
  ) {}

  async execute(command: UpdateFactionCommand): Promise<Faction> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) {
      throw new NotFoundError('Faction', command.factionId);
    }
    faction.update(command.name, command.management, command.shortDescription, command.description);
    const updated = await this.factionRepository.update(command.factionId, faction);
    faction.getUncommittedEvents().forEach((event) => this.factionEventBus.publish(event));
    return updated;
  }
}

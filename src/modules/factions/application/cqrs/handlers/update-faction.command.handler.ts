import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Faction } from 'src/modules/factions/domain/aggregates/faction.aggregate';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import type { FactionRepository } from '../../ports/faction.repository';
import type { FactionEventBusPort } from '../../ports/faction-event-bus.port';
import { UpdateFactionCommand } from '../commands/update-faction.command';

@CommandHandler(UpdateFactionCommand)
export class UpdateFactionCommandHandler implements ICommandHandler<UpdateFactionCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: FactionEventBusPort,
  ) {}

  async execute(command: UpdateFactionCommand): Promise<Faction> {
    const current = await this.factionRepository.findById(command.factionId);
    if (!current) {
      throw new NotFoundError('Faction', command.factionId);
    }
    this.updateData(current, command);
    const updated = await this.factionRepository.update(command.factionId, current);
    await this.factionNotificationPort.updated(updated);
    return updated;
  }

  private updateData(current: Faction, command: UpdateFactionCommand): void {
    if (command.name) {
      current.name = command.name;
    }
    if (command.availableGold) {
      current.management.availableGold = command.availableGold;
    }
    if (command.availableXP) {
      current.management.availableXP = command.availableXP;
    }
    if (command.description) {
      current.description = command.description;
    }
  }
}

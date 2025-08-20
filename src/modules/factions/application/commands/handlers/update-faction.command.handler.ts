import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateFactionCommand } from '../update-faction.command';
import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import * as fr from '../../ports/out/faction-repository';
import * as fep from '../../ports/out/game-event-producer';

@CommandHandler(UpdateFactionCommand)
export class UpdateFactionCommandHandler implements ICommandHandler<UpdateFactionCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: fr.FactionRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: fep.FactionEventProducer,
  ) {}

  async execute(command: UpdateFactionCommand): Promise<Faction> {
    const current = await this.factionRepository.findById(command.factionId);
    if (!current) {
      throw new NotFoundError('Faction', command.factionId);
    }
    const faction: Partial<Faction> = { ...command, updatedAt: new Date() };
    const updated = await this.factionRepository.update(command.factionId, faction);
    await this.factionNotificationPort.updated(updated);
    return updated;
  }
}

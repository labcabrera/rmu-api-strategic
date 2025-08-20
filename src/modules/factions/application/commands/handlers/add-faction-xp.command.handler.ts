import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Faction } from 'src/modules/factions/domain/entities/faction.entity';
import { ForbiddenError, NotFoundError } from 'src/modules/shared/domain/errors';
import * as fr from '../../ports/out/faction-repository';
import * as fep from '../../ports/out/game-event-producer';
import { AddFactionXPCommand } from '../add-faction-xp.command';

@CommandHandler(AddFactionXPCommand)
export class AddFactionXPCommandHandler implements ICommandHandler<AddFactionXPCommand, Faction> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: fr.FactionRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: fep.FactionEventProducer,
  ) {}

  async execute(command: AddFactionXPCommand): Promise<Faction> {
    if (!command.roles.includes('faction-management')) {
      throw new ForbiddenError('You do not have permission to add XP to this faction. Required faction-management role.');
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

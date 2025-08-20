import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from 'src/modules/shared/domain/errors';
import { DeleteFactionCommand } from '../delete-faction.command';
import * as factionRepository from '../../ports/out/faction-repository';
import * as gameEventProducer from '../../ports/out/game-event-producer';

@CommandHandler(DeleteFactionCommand)
export class DeleteFactionCommandHandler implements ICommandHandler<DeleteFactionCommand> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: factionRepository.FactionRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: gameEventProducer.FactionEventProducer,
  ) {}

  async execute(command: DeleteFactionCommand): Promise<void> {
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) {
      throw new NotFoundError('Faction', command.factionId);
    }
    //TODO delete characters
    await this.factionRepository.deleteById(command.factionId);
    await this.factionNotificationPort.deleted(faction);
  }
}

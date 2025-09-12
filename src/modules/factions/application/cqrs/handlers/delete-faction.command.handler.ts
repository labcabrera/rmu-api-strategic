import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import type { FactionRepository } from '../../ports/out/faction-repository';
import type { FactionEventProducer } from '../../ports/out/game-event-producer';
import { DeleteFactionCommand } from '../commands/delete-faction.command';

@CommandHandler(DeleteFactionCommand)
export class DeleteFactionCommandHandler implements ICommandHandler<DeleteFactionCommand> {
  constructor(
    @Inject('FactionRepository') private readonly factionRepository: FactionRepository,
    @Inject('FactionEventProducer') private readonly factionNotificationPort: FactionEventProducer,
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

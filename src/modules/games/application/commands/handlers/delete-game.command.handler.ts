import { Inject } from '@nestjs/common';

import * as raceRepository from '../../ports/out/game-repository';
import * as raceNotificationPort from '../../ports/out/game-event-producer';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteGameCommand } from '../delete-game.command';
import { NotFoundError } from 'src/modules/shared/domain/errors';

@CommandHandler(DeleteGameCommand)
export class DeleteGameCommandHandler implements ICommandHandler<DeleteGameCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: raceRepository.GameRepository,
    @Inject('GameEventProducer') private readonly gameNotificationPort: raceNotificationPort.GameEventProducer,
  ) {}

  async execute(command: DeleteGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(command.id);
    if (!game) {
      throw new NotFoundError('Game', command.id);
    }
    //TODO delete characters, factions...
    await this.gameRepository.deleteById(command.id);
    await this.gameNotificationPort.deleted(game);
  }
}

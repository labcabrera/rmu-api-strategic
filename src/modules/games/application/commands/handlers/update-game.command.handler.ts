import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as raceNotificationPort from '../../ports/out/game-event-producer';
import { Game } from 'src/modules/games/domain/entities/game';
import * as gameRepository from '../../ports/out/game-repository';
import { UpdateGameCommand } from '../update-game.command';
import { NotFoundError } from 'src/modules/shared/domain/errors';

@CommandHandler(UpdateGameCommand)
export class UpdateGameCommandHandler implements ICommandHandler<UpdateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('GameEventProducer') private readonly raceNotificationPort: raceNotificationPort.GameEventProducer,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    const current = await this.gameRepository.findById(command.gameId);
    if (!current) {
      throw new NotFoundError('Game', command.gameId);
    }
    const game: Partial<Game> = { ...command, updatedAt: new Date() };
    const updated = await this.gameRepository.update(command.gameId, game);
    await this.raceNotificationPort.updated(updated);
    return updated;
  }
}

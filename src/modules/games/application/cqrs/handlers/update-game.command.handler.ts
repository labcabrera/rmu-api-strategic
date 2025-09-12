import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import { UpdateGameCommand } from '../commands/update-game.command';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';

@CommandHandler(UpdateGameCommand)
export class UpdateGameCommandHandler implements ICommandHandler<UpdateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly raceNotificationPort: GameEventBusPort,
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

import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateGameCommand } from '../create-game.command';
import { Game } from 'src/modules/games/domain/entities/game';
import * as gameRepository from '../../ports/out/game-repository';
import * as raceEventProducer from '../../ports/out/game-event-producer';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('GameEventProducer') private readonly gameNotificationPort: raceEventProducer.GameEventProducer,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    const game: Partial<Game> = {
      ...command,
      owner: command.userId,
      createdAt: new Date(),
    };
    const savedGame = await this.gameRepository.save(game);
    await this.gameNotificationPort.created(savedGame);
    return savedGame;
  }
}

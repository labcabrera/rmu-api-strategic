import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { CreateGameCommand } from '../create-game.command';
import { Game } from 'src/modules/games/domain/entities/game';
import * as gameRepository from '../../ports/out/game-repository';
import * as raceEventProducer from '../../ports/out/game-event-producer';
import * as realmClient from '../../ports/out/realm-client';
import { ValidationError } from 'src/modules/shared/domain/errors';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('RealmClient') private readonly realmClient: realmClient.RealmClient,
    @Inject('GameEventProducer') private readonly gameNotificationPort: raceEventProducer.GameEventProducer,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    const realm = await this.realmClient.getRealmById(command.realm);
    if (!realm) {
      throw new ValidationError('Realm not found');
    }
    const game: Partial<Game> = {
      ...command,
      status: 'open',
      owner: command.userId,
      createdAt: new Date(),
    };
    const savedGame = await this.gameRepository.save(game);
    await this.gameNotificationPort.created(savedGame);
    return savedGame;
  }
}

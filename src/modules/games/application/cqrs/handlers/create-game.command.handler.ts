import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/entities/game.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors';
import { CreateGameCommand } from '../commands/create-game.command';
import type { GameEventProducer } from '../../ports/out/game-event-producer';
import type { GameRepository } from '../../ports/out/game-repository';
import type { RealmClient } from '../../ports/out/realm-client';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('RealmClient') private readonly realmClient: RealmClient,
    @Inject('GameEventProducer') private readonly gameNotificationPort: GameEventProducer,
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

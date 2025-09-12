import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/entities/game.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors';
import { CreateGameCommand } from '../commands/create-game.command';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import type { RealmClientPort } from '../../ports/realm-client.port';

@CommandHandler(CreateGameCommand)
export class CreateGameCommandHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('RealmClient') private readonly realmClient: RealmClientPort,
    @Inject('GameEventProducer') private readonly gameNotificationPort: GameEventBusPort,
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

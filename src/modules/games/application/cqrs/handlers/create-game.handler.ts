import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { ValidationError } from 'src/modules/shared/domain/errors';
import { CreateGameCommand } from '../commands/create-game.command';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import type { RealmClientPort } from '../../ports/realm-client.port';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('RealmClient') private readonly realmClient: RealmClientPort,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    const realm = await this.realmClient.getRealmById(command.realmId);
    if (!realm) {
      throw new ValidationError('Realm not found');
    }
    const game = Game.create(
      command.name,
      realm.id,
      realm.name,
      command.options,
      command.powerLevel,
      command.description,
      command.userId,
    );
    const savedGame = await this.gameRepository.save(game);
    game.getUncommittedEvents().forEach((event) => this.gameEventBus.publish(event));
    return savedGame;
  }
}

import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { CreateGameCommand } from '../commands/create-game.command';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import type { RealmClientPort } from '../../ports/realm-client.port';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';

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
    const game = Game.create({
      name: command.name,
      realmId: realm.id,
      realmName: realm.name,
      options: command.options,
      powerLevel: command.powerLevel,
      shortDescription: command.shortDescription,
      description: command.description,
      owner: command.userId,
    });
    const savedGame = await this.gameRepository.save(game);
    game.getUncommittedEvents().forEach((event) => this.gameEventBus.publish(event));
    return savedGame;
  }
}

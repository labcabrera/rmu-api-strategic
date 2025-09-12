import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { NotFoundError } from 'src/modules/shared/domain/errors';
import { UpdateGameCommand } from '../commands/update-game.command';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';

@CommandHandler(UpdateGameCommand)
export class UpdateGameHandler implements ICommandHandler<UpdateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    const current = await this.gameRepository.findById(command.gameId);
    if (!current) {
      throw new NotFoundError('Game', command.gameId);
    }
    current.update(command.name, undefined, undefined, command.description);
    const updated = await this.gameRepository.update(current.id, current);
    current.getUncommittedEvents().forEach((event) => this.gameEventBus.publish(event));
    return updated;
  }
}

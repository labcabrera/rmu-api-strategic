import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { GameDeletedEvent } from 'src/modules/games/domain/events/game.events';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';

@CommandHandler(DeleteGameCommand)
export class DeleteGameHandler implements ICommandHandler<DeleteGameCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameNotificationPort: GameEventBusPort,
  ) {}

  async execute(command: DeleteGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(command.id);
    if (!game) {
      throw new NotFoundError('Game', command.id);
    }
    await this.gameRepository.deleteById(command.id);
    this.gameNotificationPort.publish(new GameDeletedEvent(game));
  }
}

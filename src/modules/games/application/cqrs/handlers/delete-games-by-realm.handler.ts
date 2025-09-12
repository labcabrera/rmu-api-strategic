import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { DeleteGamesByRealmCommand } from '../commands/delete-games-by-realm.command';

@CommandHandler(DeleteGamesByRealmCommand)
export class DeleteGamesByRealmHandler implements ICommandHandler<DeleteGamesByRealmCommand, void> {
  private readonly logger = new Logger(DeleteGamesByRealmHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameNotificationPort: GameEventBusPort,
    private commandBus: CommandBus,
  ) {}

  async execute(command: DeleteGamesByRealmCommand): Promise<void> {
    this.logger.log(`Deleting games for realm ${command.realmId}`);
    const games = await this.gameRepository.findByRealm(command.realmId);
    this.logger.log(`Found ${games.length} games for realm ${command.realmId}`);
    await Promise.all(
      games.map((game) => {
        const deleteGameCommand = new DeleteGameCommand(
          game.id,
          `Deleted realm ${command.realmId}`,
          command.userId,
          command.roles,
        );
        return this.commandBus.execute(deleteGameCommand);
      }),
    );
  }
}

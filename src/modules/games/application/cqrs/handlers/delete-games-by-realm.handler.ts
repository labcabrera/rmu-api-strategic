import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { DeleteGamesByRealmCommand } from '../commands/delete-games-by-realm.command';

@CommandHandler(DeleteGamesByRealmCommand)
export class DeleteGamesByRealmHandler implements ICommandHandler<DeleteGamesByRealmCommand, void> {
  private readonly logger = new Logger(DeleteGamesByRealmHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private commandBus: CommandBus,
  ) {}

  async execute(command: DeleteGamesByRealmCommand): Promise<void> {
    this.logger.log(`Deleting games for realm ${command.realmId}`);
    const games = await this.gameRepository.findByRealm(command.realmId);
    this.logger.log(`Found ${games.length} games for realm ${command.realmId}`);
    await Promise.all(
      games.map(game => {
        const deleteGameCommand = new DeleteGameCommand(game.id, command.userId, command.roles);
        return this.commandBus.execute(deleteGameCommand);
      }),
    );
  }
}

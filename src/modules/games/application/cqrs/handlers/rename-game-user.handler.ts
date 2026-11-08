import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GAME_REPOSITORY, type GameRepository } from '../../ports/game-repository.port.js';
import { RenameGameUserCommand } from '../commands/rename-game-user.command.js';

@CommandHandler(RenameGameUserCommand)
export class RenameGameUserHandler implements ICommandHandler<RenameGameUserCommand, void> {
  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async execute(command: RenameGameUserCommand): Promise<void> {
    await this.gameRepository.renameUser(command.userId, command.name);
  }
}

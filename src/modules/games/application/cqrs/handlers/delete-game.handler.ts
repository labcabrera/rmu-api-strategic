import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { GameDeletedEvent } from '../../../domain/events/game.events';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(DeleteGameCommand)
export class DeleteGameHandler implements ICommandHandler<DeleteGameCommand> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: DeleteGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(command.id);
    if (!game) throw new NotFoundError('Game', command.id);
    this.gameGuard.checkDelete(game, command.userId, command.roles);

    await this.gameRepository.deleteById(command.id);
    await this.events.publish('game', new GameDeletedEvent(game));
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Game } from '../../../domain/aggregates/game.js';
import { UpdateGameCommand } from '../commands/update-game.command.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateGameCommand)
export class UpdateGameHandler implements ICommandHandler<UpdateGameCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    const current = await this.gameRepository.findById(command.gameId);
    if (!current) {
      throw new NotFoundError('Game', command.gameId);
    }
    // The owner of the game or an admin (F-strategic-15).
    this.gameGuard.checkUpdate(current, command.userId, command.roles);
    current.checkVersion(command.expectedVersion);
    current.update({
      name: command.name,
      options: command.options,
      powerLevel: command.powerLevel,
      shortDescription: command.shortDescription,
      description: command.description,
      imageUrl: command.imageUrl,
    });
    // Spec 021, decision 9: a PATCH without changes neither writes nor publishes.
    if (!current.hasChanges()) return current;
    const updated = await this.gameRepository.update(current);
    await this.events.publishChanges('game', current);
    return updated;
  }
}

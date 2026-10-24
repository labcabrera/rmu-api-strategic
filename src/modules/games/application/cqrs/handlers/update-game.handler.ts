import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Game } from '../../../domain/aggregates/game';
import { UpdateGameCommand } from '../commands/update-game.command';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(UpdateGameCommand)
export class UpdateGameHandler implements ICommandHandler<UpdateGameCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    const current = await this.gameRepository.findById(command.gameId);
    if (!current) {
      throw new NotFoundError('Game', command.gameId);
    }
    current.update({
      name: command.name,
      options: command.options,
      powerLevel: command.powerLevel,
      shortDescription: command.shortDescription,
      description: command.description,
      imageUrl: command.imageUrl,
    });
    const updated = await this.gameRepository.update(current.id, current);
    await this.events.publishChanges('game', current);
    return updated;
  }
}

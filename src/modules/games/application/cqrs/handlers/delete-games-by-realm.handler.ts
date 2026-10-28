import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { DeleteGamesByRealmCommand } from '../commands/delete-games-by-realm.command.js';
import { GameDeletedEvent } from '../../../domain/events/game.events.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Deletes the games of a deleted realm through the repository, one at a time, publishing a game.deleted per game like
 * DeleteGameHandler (spec 016, decision 7). Idempotent: a repeated message no longer finds any game.
 */
@CommandHandler(DeleteGamesByRealmCommand)
export class DeleteGamesByRealmHandler implements ICommandHandler<DeleteGamesByRealmCommand, void> {
  private readonly logger = new Logger(DeleteGamesByRealmHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: DeleteGamesByRealmCommand): Promise<void> {
    const games = await this.gameRepository.findByRealm(command.realmId);
    this.logger.log(`Deleting ${games.length} games of realm ${command.realmId}`);
    for (const game of games) {
      await this.gameRepository.deleteById(game.id);
      await this.events.publish('game', new GameDeletedEvent(game));
    }
  }
}

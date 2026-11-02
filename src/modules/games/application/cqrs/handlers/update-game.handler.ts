import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Game } from '../../../domain/aggregates/game.js';
import { UpdateGameCommand } from '../commands/update-game.command.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type GameGuardPort, GAME_GUARD } from '../../ports/game-guard.port.js';
import { randomUUID } from 'crypto';
import { type GameTimeLogRepository, GAME_TIME_LOG_REPOSITORY } from '../../ports/game-time-log-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateGameCommand)
export class UpdateGameHandler implements ICommandHandler<UpdateGameCommand, Game> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
    @Inject(GAME_TIME_LOG_REPOSITORY) private readonly timeLogRepository: GameTimeLogRepository,
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
    // Workspace spec 065, decision 6: a correction of the calendar applies no effects, but leaves a trace.
    const adjust = command.calendar
      ? current.adjustCalendar(command.calendar.startDate, command.calendar.elapsedDays)
      : { changed: false, fromDay: 0, toDay: 0 };
    // Spec 021, decision 9: a PATCH without changes neither writes nor publishes.
    if (!current.hasChanges()) return current;
    const updated = await this.gameRepository.update(current);
    await this.events.publishChanges('game', current);
    if (adjust.changed) {
      await this.timeLogRepository.save({
        id: randomUUID(),
        gameId: current.id,
        type: 'adjust',
        fromDay: adjust.fromDay,
        toDay: adjust.toDay,
        days: adjust.toDay - adjust.fromDay,
        hours: 0,
        characters: [],
        userId: command.userId,
        createdAt: new Date().toISOString(),
      });
    }
    return updated;
  }
}

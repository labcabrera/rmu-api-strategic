import { randomUUID } from 'crypto';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { resolvePowerLevel } from '../../../../games/domain/value-objects/game-power-level.vo.js';
import { MAX_PASS_DAYS } from '../../../../games/domain/value-objects/game-calendar.vo.js';
import {
  DEFAULT_PASS_TIME_ACTIVITY,
  type GameTimeLogCharacter,
  type PassTimeActivity,
} from '../../../../games/domain/value-objects/game-time-log-entry.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { type GameTimeLogRepository, GAME_TIME_LOG_REPOSITORY } from '../../../../games/application/ports/game-time-log-repository.port.js';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { DomainError, NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { CharacterRestService } from '../../services/character-rest.service.js';
import { PassTimeCommand } from '../commands/pass-time.command.js';

export interface PassTimeResult {
  game: Game;
  fromDay: number;
  toDay: number;
  days: number;
  hours: number;
  dryRun: boolean;
  characters: GameTimeLogCharacter[];
  logEntryId?: string;
}

/**
 * Time passes in a campaign (workspace spec 065): the calendar moves on and every live character of the campaign
 * rests as its activity says, with the rest of one character (decision 5). Only the owner of the game or an admin.
 * The calendar is stored first, with the version of the game as a lock; a character that fails later is recorded with
 * its error and the step goes on (decision 12).
 */
@CommandHandler(PassTimeCommand)
export class PassTimeHandler implements ICommandHandler<PassTimeCommand, PassTimeResult> {
  private readonly logger = new Logger(PassTimeHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_TIME_LOG_REPOSITORY) private readonly timeLogRepository: GameTimeLogRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
    private readonly store: CharacterHealthStore,
    private readonly restService: CharacterRestService,
  ) {}

  async execute(command: PassTimeCommand): Promise<PassTimeResult> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new NotFoundError('Game', command.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the time of this game');
    const { days, hours } = command;
    if (days + hours === 0) throw new ValidationError('Passing time requires some days or hours', 'err-pass-time-required');
    if (days > MAX_PASS_DAYS) throw new ValidationError(`At most ${MAX_PASS_DAYS} days at a time`, 'err-pass-time-too-long');
    game.checkVersion(command.expectedVersion);

    const characters = await this.characterRepository.findByGameId(game.id);
    const activities = this.activities(command, new Set(characters.map(c => c.id)));
    for (const character of characters) {
      if (character.status === 'dead' && command.characters.some(c => c.characterId === character.id && c.activity !== 'excluded')) {
        throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
      }
    }

    let fromDay = game.calendar.currentDay;
    let toDay = game.calendar.advance(days, hours).currentDay;
    let current = game;
    if (!command.dryRun) {
      ({ fromDay, toDay } = game.passTime(days, hours));
      current = await this.gameRepository.update(game);
      await this.events.publishChanges('game', game);
    }

    const calculator = await this.restService.calculator();
    // Workspace spec 079, E: the power points come back as the power level of the game says
    const ppRecoveryPercent = resolvePowerLevel(game.powerLevel).ppRecoveryPercent;
    const results: GameTimeLogCharacter[] = [];
    for (const character of characters) {
      if (character.status === 'dead') continue;
      const activity = activities.get(character.id) ?? DEFAULT_PASS_TIME_ACTIVITY;
      const entry: GameTimeLogCharacter = { characterId: character.id, name: character.name, activity };
      if (activity !== 'excluded') {
        try {
          const result = await this.restService.apply(
            character,
            { days, hours, fullRest: activity === 'full-rest', active: activity === 'active', currentGameDay: toDay, ppRecoveryPercent },
            calculator,
          );
          if (!command.dryRun) await this.store.save(character);
          entry.result = { ...result };
        } catch (error) {
          if (command.dryRun) throw error;
          entry.error = PassTimeHandler.toError(error);
          this.logger.warn(`Pass time of game ${game.id}: character ${character.id} failed: ${entry.error.message}`);
        }
      }
      results.push(entry);
    }

    const result: PassTimeResult = { game: current, fromDay, toDay, days, hours, dryRun: command.dryRun, characters: results };
    if (!command.dryRun) {
      const saved = await this.timeLogRepository.save({
        id: randomUUID(),
        gameId: game.id,
        type: 'pass-time',
        fromDay,
        toDay,
        days,
        hours,
        note: command.note?.trim() || undefined,
        characters: results,
        userId: command.userId,
        createdAt: new Date().toISOString(),
      });
      result.logEntryId = saved.id;
    }
    return result;
  }

  private activities(command: PassTimeCommand, inGame: Set<string>): Map<string, PassTimeActivity> {
    const activities = new Map<string, PassTimeActivity>();
    for (const { characterId, activity } of command.characters) {
      if (!inGame.has(characterId)) {
        throw new ValidationError(`Character ${characterId} is not in the game`, 'err-pass-time-character-not-in-game');
      }
      activities.set(characterId, activity);
    }
    return activities;
  }

  private static toError(error: unknown): { code: string; message: string } {
    if (error instanceof DomainError) return { code: error.code, message: error.message };
    return { code: 'internal-error', message: error instanceof Error ? error.message : String(error) };
  }
}

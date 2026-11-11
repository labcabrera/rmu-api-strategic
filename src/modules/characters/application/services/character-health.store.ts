import { Inject, Injectable } from '@nestjs/common';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port.js';
import { RMU_ADMIN, RMU_SERVICE } from '../../../shared/domain/entities/user-roles.js';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors/errors.js';
import { Character } from '../../domain/aggregates/character.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../ports/character-repository.port.js';
import { type HealingLogRepository, HEALING_LOG_REPOSITORY } from '../ports/healing-log-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { resolvePowerLevel } from '../../../games/domain/value-objects/game-power-level.vo.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { CharacterAccess } from './character-access.service.js';

export interface HealthAccessOptions {
  /** Service to service calls (rmu-api-tactical applying an outcome) */
  allowService?: boolean;
  /** The players of the faction of the character (spec 072; the owner of the character before) */
  allowCharacterOwner?: boolean;
}

/**
 * Loads a character for a health operation checking who may change it (administrator, the masters and, depending on
 * the operation, the players of its faction or another service), and stores it with its healing log and event.
 */
@Injectable()
export class CharacterHealthStore {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(HEALING_LOG_REPOSITORY) private readonly healingLogRepository: HealingLogRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly gameAccess: GameAccess,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async load(characterId: string, userId: string, roles: string[], options: HealthAccessOptions = { allowCharacterOwner: true }) {
    const character = await this.characterRepository.findById(characterId);
    if (!character) throw new NotFoundError('Character', characterId, 'err-character-not-found');
    await this.checkAccess(character, userId, roles, options);
    return character;
  }

  async findCharacter(characterId: string): Promise<Character | null> {
    return this.characterRepository.findById(characterId);
  }

  private async checkAccess(character: Character, userId: string, roles: string[], options: HealthAccessOptions): Promise<void> {
    if (roles.includes(RMU_ADMIN)) return;
    if (options.allowService && roles.includes(RMU_SERVICE)) return;
    // Spec 072: the masters always, the players of its faction when the operation allows it.
    const game = await this.gameRepository.findById(character.gameId);
    if (this.gameAccess.canManage(game, userId, roles)) return;
    if (options.allowCharacterOwner && (await this.characterAccess.canChange(character, userId, roles))) return;
    throw new ForbiddenError('You do not have permission to change the health of this character', 'err-character-health-forbidden');
  }

  /**
   * The current day of the campaign of the character (workspace spec 065), for the expiry of its temporary modifiers
   * (workspace spec 068). Day 1 when the game is not found.
   */
  async currentGameDay(character: Character): Promise<number> {
    const game = await this.gameRepository.findById(character.gameId);
    return game?.calendar?.currentDay ?? 1;
  }

  /**
   * What a rest of the character takes from its game: the current day (see currentGameDay) and the percent of power
   * points per rest period of its power level (workspace spec 079, E; 10 when the game is not found).
   */
  async restRules(character: Character): Promise<{ currentGameDay: number; ppRecoveryPercent: number }> {
    const game = await this.gameRepository.findById(character.gameId);
    return {
      currentGameDay: game?.calendar?.currentDay ?? 1,
      ppRecoveryPercent: resolvePowerLevel(game?.powerLevel).ppRecoveryPercent,
    };
  }

  async save(character: Character): Promise<Character> {
    // Workspace spec 065: what happens to the health carries the day of the campaign.
    const game = await this.gameRepository.findById(character.gameId);
    if (game?.calendar) character.stampGameDay(game.calendar.currentDay);
    const entries = character.pullHealingLog();
    const updated = await this.characterRepository.update(character);
    await this.healingLogRepository.saveAll(character.id, character.gameId, entries);
    await this.events.publishChanges('character', character);
    return updated;
  }
}

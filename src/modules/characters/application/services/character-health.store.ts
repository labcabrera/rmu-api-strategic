import { Inject, Injectable } from '@nestjs/common';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port';
import { RMU_ADMIN, RMU_SERVICE } from '../../../shared/domain/entities/user-roles';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors/errors';
import { Character } from '../../domain/aggregates/character';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../ports/character-repository.port';
import { type HealingLogRepository, HEALING_LOG_REPOSITORY } from '../ports/healing-log-repository.port';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port';

export interface HealthAccessOptions {
  /** Service to service calls (rmu-api-tactical applying an outcome) */
  allowService?: boolean;
  /** The owner of the character (player) */
  allowCharacterOwner?: boolean;
}

/**
 * Loads a character for a health operation checking who may change it (administrator, game owner and, depending on
 * the operation, the character owner or another service), and stores it with its healing log and event.
 */
@Injectable()
export class CharacterHealthStore {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(HEALING_LOG_REPOSITORY) private readonly healingLogRepository: HealingLogRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
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
    if (options.allowCharacterOwner && character.owner === userId) return;
    const game = await this.gameRepository.findById(character.gameId);
    if (game && game.owner === userId) return;
    throw new ForbiddenError('You do not have permission to change the health of this character', 'err-character-health-forbidden');
  }

  async save(character: Character): Promise<Character> {
    const entries = character.pullHealingLog();
    const updated = await this.characterRepository.update(character.id, character);
    await this.healingLogRepository.saveAll(character.id, character.gameId, entries);
    await this.events.publishChanges('character', character);
    return updated;
  }
}

import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../../items/application/ports/item-repository.port.js';
import { DomainError, NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { CharacterWriter } from '../../services/character-writer.service.js';
import { AwardGroupXpCommand, type XpEventType } from '../commands/award-group-xp.command.js';

export interface GroupXpCharacterResult {
  characterId: string;
  name: string;
  /** Experience before and after the award, and the level it allows */
  xpBefore?: number;
  xpAfter?: number;
  level?: number;
  availableLevel?: number;
  /** Why the character did not get it */
  error?: { code: string; message: string };
}

export interface GroupXpResult {
  gameId: string;
  xp: number;
  eventType: XpEventType | null;
  characters: GroupXpCharacterResult[];
}

/**
 * Experience for the group (workspace spec 079, E): the masters of the game (and admins, spec 071) give the whole
 * amount to each chosen character, as the experience of one character does. Like the step of time (spec 065), a
 * character that fails is recorded with its error and the others go on. The experience multiplier of the game is
 * not applied: it only changes what the clients show (decision of the spec).
 */
@CommandHandler(AwardGroupXpCommand)
export class AwardGroupXpHandler implements ICommandHandler<AwardGroupXpCommand, GroupXpResult> {
  private readonly logger = new Logger(AwardGroupXpHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly gameAccess: GameAccess,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterWriter: CharacterWriter,
  ) {}

  async execute(command: AwardGroupXpCommand): Promise<GroupXpResult> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new NotFoundError('Game', command.gameId);
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the experience of this game');
    if (!Number.isInteger(command.xp) || command.xp <= 0) {
      throw new ValidationError('The experience must be a positive whole number', 'err-group-xp-invalid');
    }

    const all = await this.characterRepository.findByGameId(game.id);
    let selected = all.filter(character => character.status !== 'dead');
    if (command.characterIds?.length) {
      const ids = new Set(command.characterIds);
      for (const id of ids) {
        if (!all.some(character => character.id === id)) {
          throw new ValidationError(`Character ${id} is not in the game`, 'err-group-xp-character-not-in-game');
        }
      }
      selected = all.filter(character => ids.has(character.id));
    }
    if (selected.length === 0) throw new ValidationError('The game has no characters to award', 'err-group-xp-no-characters');

    const characters: GroupXpCharacterResult[] = [];
    for (const listed of selected) {
      const entry: GroupXpCharacterResult = { characterId: listed.id, name: listed.name };
      try {
        // The sheet is processed again: the character is read as the experience of one character reads it
        const character = await this.characterRepository.findById(listed.id);
        if (!character) throw new NotFoundError('Character', listed.id, 'err-character-not-found');
        const xpBefore = character.experience.xp;
        const items = await this.itemRepository.findByCharacterId(character.id);
        character.experience.xp += command.xp;
        this.characterProcessorService.process(character, items);
        const saved = await this.characterWriter.save(character);
        Object.assign(entry, {
          xpBefore,
          xpAfter: saved.experience.xp,
          level: saved.experience.level,
          availableLevel: saved.experience.availableLevel,
        });
      } catch (error) {
        entry.error = AwardGroupXpHandler.toError(error);
        this.logger.warn(`Group experience of game ${game.id}: character ${listed.id} failed: ${entry.error.message}`);
      }
      characters.push(entry);
    }
    return { gameId: game.id, xp: command.xp, eventType: command.eventType ?? null, characters };
  }

  private static toError(error: unknown): { code: string; message: string } {
    if (error instanceof DomainError) return { code: error.code, message: error.message };
    return { code: 'internal-error', message: error instanceof Error ? error.message : String(error) };
  }
}

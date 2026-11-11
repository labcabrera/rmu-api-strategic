import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Faction } from '../../../factions/domain/aggregates/faction.js';
import type { Game } from '../../../games/domain/aggregates/game.js';
import { resolveOptions, STARTING_WEALTH_SP_PER_LEVEL } from '../../../games/domain/value-objects/game-options.vo.js';
import { ItemLedger } from '../../../items/application/services/item-ledger.service.js';
import { Wallet } from '../../../items/application/services/wallet.service.js';
import { GOLD_COIN } from '../../../items/domain/aggregates/item.js';
import { roundGold } from '../../../items/domain/services/price-calculator.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../items/application/ports/item-repository.port.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../ports/character-repository.port.js';
import type { Character } from '../../domain/aggregates/character.js';
import { CharacterProcessorService } from '../../domain/services/character-processor.service.js';
import { CharacterWriter } from './character-writer.service.js';

/** Silver pieces in a gold piece (Core Law table 6-0a): the gold coin stack of a character counts gold pieces. */
export const SILVER_PER_GOLD = 10;

/**
 * Gold pieces a new character of `level` gets with the starting wealth of the game (workspace spec 079, E; Core Law
 * table 6-0b, silver pieces per level). 0 without starting wealth or at level 0: no empty stack is made.
 */
export function startingWealthGold(game: Pick<Game, 'options'> | null | undefined, level: number): number {
  const rate = STARTING_WEALTH_SP_PER_LEVEL[resolveOptions(game?.options).startingWealth] ?? 0;
  if (!(rate > 0) || !(level > 0)) return 0;
  return roundGold((rate * level) / SILVER_PER_GOLD);
}

/**
 * The starting level of a new character: it is created at level 0 with the experience of the level it starts at, which
 * it reaches with its level ups.
 */
const startingLevel = (character: Character): number => Math.max(character.experience.level, character.experience.availableLevel);

/**
 * The starting money of a character created in a game with the option (workspace spec 079, E): the gold coin stack of
 * the character, carried, with a ledger entry `starting-wealth`, and the sheet processed again (the coins weigh).
 */
@Injectable()
export class StartingWealthService {
  private readonly logger = new Logger(StartingWealthService.name);

  constructor(
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterWriter: CharacterWriter,
  ) {}

  /**
   * The starting money of a stored new character and its sheet with the coins; null when the game gives none. The
   * character is already stored, so a failure is logged instead of failing its creation (a retry would make it twice):
   * the game master can still give the coins by hand.
   */
  async apply(character: Character, game: Game, faction: Faction, userId: string): Promise<Character | null> {
    if (startingWealthGold(game, startingLevel(character)) <= 0) return null;
    try {
      await this.grant(character, game, faction, userId);
      // The sheet is processed again as stored (with its version), now with the coins
      const stored = (await this.characterRepository.findById(character.id)) ?? character;
      this.characterProcessorService.process(stored, await this.itemRepository.findByCharacterId(character.id));
      return await this.characterWriter.save(stored);
    } catch (error) {
      this.logger.error(`Starting wealth of character ${character.id} failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /** Gives the starting money; answers the gold given (0 when the game has none for the character). */
  async grant(character: Character, game: Game, faction: Faction, userId: string): Promise<number> {
    const gold = startingWealthGold(game, startingLevel(character));
    if (gold <= 0) return 0;
    const holder = { kind: 'character' as const, id: character.id };
    const payment = await this.wallet.credit({ holder, gameId: character.gameId, character, faction }, gold);
    await this.ledger.record({
      gameId: character.gameId,
      kind: 'starting-wealth',
      itemId: null,
      itemTypeId: GOLD_COIN,
      itemName: null,
      amount: gold,
      from: null,
      to: holder,
      payments: [payment],
      note: resolveOptions(game.options).startingWealth,
      userId,
    });
    this.logger.log(`Character ${character.id} starts with ${gold} gold (${resolveOptions(game.options).startingWealth})`);
    return gold;
  }
}

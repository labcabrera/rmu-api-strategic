import { Inject, Injectable } from '@nestjs/common';
import { ALCHEMY_TABLES_CLIENT, type AlchemyTablesClientPort } from '../../../enchantments/application/ports/alchemy-tables-client.port.js';
import { DEFAULT_POWER_LEVEL, POWER_LEVELS, type PowerLevel } from '../../../enchantments/domain/value-objects/alchemy.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';

/**
 * Multiplier of the power level of the campaign (Treasure Law table 5-3d, workspace specs 064 and 067): it applies to
 * the magic part of a price, never to the base item. The book prices are the Superior ones (multiplier 1), so that
 * level needs no tables.
 */
@Injectable()
export class PowerLevels {
  constructor(
    @Inject(ALCHEMY_TABLES_CLIENT) private readonly alchemyTables: AlchemyTablesClientPort,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  /**
   * The multiplier of `powerLevel`. Without it, workspace spec 079 (E): the preset of the power level of the game
   * `gameId` when it has one, Superior otherwise.
   */
  async multiplier(powerLevel: PowerLevel | null | undefined, gameId?: string | null): Promise<number> {
    const level = powerLevel ?? (await this.gamePreset(gameId)) ?? DEFAULT_POWER_LEVEL;
    if (level === DEFAULT_POWER_LEVEL) return 1;
    const value = (await this.alchemyTables.getAlchemyTables())?.powerLevels?.[level];
    if (typeof value === 'number' && value > 0) return value;
    throw new ValidationError(`Core has no multiplier for the power level ${level}`, 'err-enchantment-power-level-unknown');
  }

  /** The power level preset of a game (workspace spec 079, E), when it has one. */
  async gamePreset(gameId: string | null | undefined): Promise<PowerLevel | undefined> {
    if (!gameId) return undefined;
    const preset = (await this.gameRepository.findById(gameId))?.powerLevel?.preset;
    return preset && (POWER_LEVELS as readonly string[]).includes(preset) ? preset : undefined;
  }
}

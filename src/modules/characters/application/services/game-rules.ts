import type { GameRepository } from '../../../games/application/ports/game-repository.port';
import { ResolvedGameOptions, resolveOptions } from '../../../games/domain/value-objects/game-options.vo';
import { ResolvedGamePowerLevel, resolvePowerLevel } from '../../../games/domain/value-objects/game-power-level.vo';

export interface GameRules {
  powerLevel: ResolvedGamePowerLevel;
  options: ResolvedGameOptions;
}

// Power level and options of the character game, with defaults for missing values (or a missing game)
export const loadGameRules = async (gameRepository: GameRepository, gameId: string): Promise<GameRules> => {
  const game = await gameRepository.findById(gameId);
  return { powerLevel: resolvePowerLevel(game?.powerLevel), options: resolveOptions(game?.options) };
};

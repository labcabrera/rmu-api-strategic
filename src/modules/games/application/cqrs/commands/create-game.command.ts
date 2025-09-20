import { GameOptions } from 'src/modules/games/domain/value-objects/game-options.vo';
import { GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';

export class CreateGameCommand {
  constructor(
    public readonly name: string,
    public readonly realmId: string,
    public readonly options: GameOptions,
    public readonly powerLevel: GamePowerLevel,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

import { GameOptions, GamePowerLevel } from '../../domain/entities/game';

export class CreateGameCommand {
  constructor(
    public readonly name: string,
    public readonly realm: string,
    public readonly options: GameOptions,
    public readonly powerLevel: GamePowerLevel,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

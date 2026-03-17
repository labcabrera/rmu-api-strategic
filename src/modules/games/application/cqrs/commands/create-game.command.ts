import { GameOptions } from 'src/modules/games/domain/value-objects/game-options.vo';
import { GamePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class CreateGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly name: string,
    public readonly realmId: string,
    public readonly options: GameOptions,
    public readonly powerLevel: GamePowerLevel,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

import { GameOptions } from '../../../domain/value-objects/game-options.vo.js';
import { GamePowerLevel } from '../../../domain/value-objects/game-power-level.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class CreateGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly name: string,
    public readonly realmId: string,
    public readonly options: GameOptions,
    public readonly powerLevel: GamePowerLevel,
    public readonly shortDescription: string | null,
    public readonly description: string | null,
    public readonly imageUrl: string | null,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

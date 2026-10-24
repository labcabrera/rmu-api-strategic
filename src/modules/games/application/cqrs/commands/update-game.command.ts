import { GameOptionsDto } from '../../../interfaces/http/dto/game-options.dto.js';
import { GamePowerLevelDto } from '../../../interfaces/http/dto/game-power-level.dto.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class UpdateGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string | undefined,
    public readonly options: GameOptionsDto | undefined,
    public readonly powerLevel: GamePowerLevelDto | undefined,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    userId: string,
    roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
  ) {
    super(userId, roles);
  }
}

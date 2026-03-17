import { GameOptionsDto } from 'src/modules/games/interfaces/http/dtos/game-options.dto';
import { GamePowerLevelDto } from 'src/modules/games/interfaces/http/dtos/game-power-level-dto';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

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
  ) {
    super(userId, roles);
  }
}

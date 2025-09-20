import { GameOptionsDto } from 'src/modules/games/interfaces/http/dtos/game-options.dto';
import { GamePowerLevelDto } from 'src/modules/games/interfaces/http/dtos/game-power-level-dto';

export class UpdateGameCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string | undefined,
    public readonly options: GameOptionsDto | undefined,
    public readonly powerLevel: GamePowerLevelDto | undefined,
    public readonly shortDescription: string | undefined,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

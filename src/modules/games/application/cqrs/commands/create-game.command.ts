import { GameOptions } from '../../../domain/value-objects/game-options.vo.js';
import { GamePowerLevel } from '../../../domain/value-objects/game-power-level.vo.js';
import type { AccessType } from '../../../../shared/domain/entities/access-type.js';
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
    public readonly startDate?: string,
    /** Spec 071: private by default; a public game takes join requests. */
    public readonly accessType: AccessType = 'private',
  ) {
    super(userId, roles);
  }
}

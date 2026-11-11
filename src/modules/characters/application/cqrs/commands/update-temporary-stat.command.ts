import type { StatKey } from '../../../domain/value-objects/character-stat.vo.js';
import type { DevPointsPoolChoice } from '../../../domain/services/dev-points/dev-points-spending.service.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class UpdateTemporaryStatCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly stat: StatKey,
    public readonly value: number,
    userId: string,
    roles: string[],
    public readonly pool: DevPointsPoolChoice = 'auto',
  ) {
    super(userId, roles);
  }
}

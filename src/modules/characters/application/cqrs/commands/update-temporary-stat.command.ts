import type { StatKey } from '../../../domain/value-objects/character-stat.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class UpdateTemporaryStatCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly stat: StatKey,
    public readonly value: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

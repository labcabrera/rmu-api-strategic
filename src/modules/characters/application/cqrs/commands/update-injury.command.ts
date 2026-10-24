import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { InjuryChanges } from '../../../domain/aggregates/character.js';

export class UpdateInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly injuryId: string,
    public readonly changes: InjuryChanges,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

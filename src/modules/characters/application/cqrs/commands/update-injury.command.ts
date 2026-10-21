import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';
import type { InjuryChanges } from 'src/modules/characters/domain/aggregates/character.aggregate';

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

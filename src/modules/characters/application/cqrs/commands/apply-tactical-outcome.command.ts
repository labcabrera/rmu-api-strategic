import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';
import { TacticalCharacterOutcome } from 'src/modules/characters/domain/value-objects/tactical-game-outcome.vo';

export class ApplyTacticalOutcomeCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly outcome: TacticalCharacterOutcome,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

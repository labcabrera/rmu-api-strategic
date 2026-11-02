import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { TacticalCharacterOutcome } from '../../../domain/value-objects/tactical-game-outcome.vo.js';

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

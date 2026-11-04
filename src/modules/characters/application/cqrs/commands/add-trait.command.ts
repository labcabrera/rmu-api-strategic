import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { DevPointsPoolChoice } from '../../../domain/services/dev-points/dev-points-spending.service.js';
import type { LanguageRanks } from '../../../domain/services/traits/multilingual.js';

export class AddTraitCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly traitId: string,
    public readonly tier: number | undefined,
    public readonly specialization: string | undefined,
    userId: string,
    roles: string[],
    public readonly pool: DevPointsPoolChoice = 'auto',
    // Workspace spec 076, A7: Multilingual only
    public readonly languageRanks?: LanguageRanks[],
  ) {
    super(userId, roles);
  }
}

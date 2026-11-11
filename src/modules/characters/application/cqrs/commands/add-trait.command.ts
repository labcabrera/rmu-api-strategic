import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { DevPointsPoolChoice } from '../../../domain/services/dev-points/dev-points-spending.service.js';
import type { TraitLink, TraitRestriction } from '../../../domain/value-objects/character-trait.vo.js';
import type { ChosenPrerequisite } from '../../../domain/services/traits/talent-purchase-policy.js';
import type { LanguageRanks } from '../../../domain/services/traits/multilingual.js';

/** Workspace spec 077: the prerequisite the game master grants, the talent a flaw is taken with and the restriction. */
export interface AddTraitPurchase {
  prerequisite?: ChosenPrerequisite;
  linkedTo?: TraitLink;
  restricted?: TraitRestriction;
}

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
    // Workspace spec 077, C11 and C12: purchase data
    public readonly purchase: AddTraitPurchase = {},
  ) {
    super(userId, roles);
  }
}

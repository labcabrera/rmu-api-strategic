import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { AmputationMethod } from '../../../domain/services/healing/amputation-rules.js';
import type { BodySide } from '../../../domain/value-objects/injury.vo.js';
import type { LostLimbLocation } from '../../../domain/value-objects/lost-limb.vo.js';
import type { ExternalHealer } from './treat-injury.command.js';

/** `POST /v1/characters/:id/amputations` (workspace spec 079, C1). */
export class AmputateLimbCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly method: AmputationMethod,
    public readonly location: LostLimbLocation,
    public readonly side: BodySide,
    public readonly cauterized: boolean | undefined,
    public readonly injuryId: string | undefined,
    public readonly healerCharacterId: string | undefined,
    public readonly healer: ExternalHealer | undefined,
    public readonly roll: number,
    /** Difficulty modifier chosen by the game master; the one of the method when missing */
    public readonly difficulty: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/characters/:id/injuries/:injuryId/strenuous-failure` (workspace spec 079, C2). */
export class StrenuousFailureCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly injuryId: string,
    public readonly absolute: boolean,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

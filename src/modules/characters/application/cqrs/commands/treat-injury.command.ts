import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { CastSupport, HealingType, TreatmentProcedure } from '../../../domain/value-objects/injury.vo.js';

export interface ExternalHealer {
  name: string;
  bonus: number;
  herbalismBonus?: number;
}

export interface HerbalismRoll {
  roll: number;
  healerCharacterId?: string;
  bonus?: number;
}

export class TreatInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly injuryId: string,
    public readonly procedure: TreatmentProcedure,
    public readonly healerCharacterId: string | undefined,
    public readonly healer: ExternalHealer | undefined,
    public readonly roll: number | undefined,
    public readonly difficulty: number | undefined,
    public readonly herbalism: HerbalismRoll | undefined,
    public readonly healingType: HealingType | undefined,
    userId: string,
    roles: string[],
    /** Workspace spec 062: a herb of the patient or of a character of its game; one dose is spent. */
    public readonly herbItemId?: string,
    /** Workspace spec 068: what holds up a cast leg (a cast only). */
    public readonly castSupport?: CastSupport,
    /** Workspace spec 068: recovery modifier of a salve, chosen by the game master (a salve only). */
    public readonly salveModifier?: number,
  ) {
    super(userId, roles);
  }
}

import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import type { HealingType, TreatmentProcedure } from '../../../domain/value-objects/injury.vo';

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
  ) {
    super(userId, roles);
  }
}

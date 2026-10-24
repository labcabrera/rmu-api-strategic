import type { TreatmentProcedure } from '../../../domain/value-objects/injury.vo.js';

export class GetTreatmentDifficultyQuery {
  constructor(
    public readonly characterId: string,
    public readonly injuryId: string,
    public readonly procedure: TreatmentProcedure,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

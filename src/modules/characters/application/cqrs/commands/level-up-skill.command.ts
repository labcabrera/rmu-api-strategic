import type { DevPointsPoolChoice } from '../../../domain/services/dev-points/dev-points-spending.service.js';

export class LevelUpSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string | null,
    public readonly userId: string,
    public readonly roles: string[],
    public readonly pool: DevPointsPoolChoice = 'auto',
  ) {}
}

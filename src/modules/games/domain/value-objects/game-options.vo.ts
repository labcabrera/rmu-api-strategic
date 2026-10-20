// 'free': talents are bought with any development points at any level.
// 'race-points-at-creation': new talents only at creation and only with bonus development points; later only improvements.
// 'flaw-points-at-creation': at creation talents are paid only with the points returned by flaws.
export type TalentPolicy = 'free' | 'race-points-at-creation' | 'flaw-points-at-creation';
export const TALENT_POLICIES: TalentPolicy[] = ['free', 'race-points-at-creation', 'flaw-points-at-creation'];

export type StatGeneration = 'roll' | 'point-buy';
export const STAT_GENERATIONS: StatGeneration[] = ['roll', 'point-buy'];

export const DEFAULT_ALLOW_THIRD_RANK = false;
export const DEFAULT_TALENT_POLICY: TalentPolicy = 'free';
export const DEFAULT_BONUS_DEV_POINTS_CAP_AT_CREATION = false;
export const DEFAULT_STAT_GENERATION: StatGeneration = 'roll';

export class GameOptions {
  constructor(
    public readonly experienceMultiplier: number,
    public readonly fatigueMultiplier: number,
    public readonly boardScaleMultiplier: number,
    public readonly letality: number,
    // Allows a third rank of the same skill in a single level, at the cost of the second one
    public readonly allowThirdRank?: boolean,
    public readonly talentPolicy?: TalentPolicy,
    // When true the bonus development points per level limit also applies to talents bought at creation
    public readonly bonusDevPointsCapAtCreation?: boolean,
    public readonly statGeneration?: StatGeneration,
  ) {}
}

export type ResolvedGameOptions = Required<GameOptions>;

export const resolveOptions = (options: Partial<GameOptions> | null | undefined): ResolvedGameOptions => ({
  experienceMultiplier: options?.experienceMultiplier ?? 1,
  fatigueMultiplier: options?.fatigueMultiplier ?? 1,
  boardScaleMultiplier: options?.boardScaleMultiplier ?? 1,
  letality: options?.letality ?? 0,
  allowThirdRank: options?.allowThirdRank ?? DEFAULT_ALLOW_THIRD_RANK,
  talentPolicy: options?.talentPolicy ?? DEFAULT_TALENT_POLICY,
  bonusDevPointsCapAtCreation: options?.bonusDevPointsCapAtCreation ?? DEFAULT_BONUS_DEV_POINTS_CAP_AT_CREATION,
  statGeneration: options?.statGeneration ?? DEFAULT_STAT_GENERATION,
});

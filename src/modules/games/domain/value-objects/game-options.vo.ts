// 'free': talents are bought with any development points at any level.
// 'race-points-at-creation': new talents only at creation and only with bonus development points; later only improvements.
// 'flaw-points-at-creation': at creation talents are paid only with the points returned by flaws.
export type TalentPolicy = 'free' | 'race-points-at-creation' | 'flaw-points-at-creation';
export const TALENT_POLICIES: TalentPolicy[] = ['free', 'race-points-at-creation', 'flaw-points-at-creation'];

export type StatGeneration = 'roll' | 'point-buy';
export const STAT_GENERATIONS: StatGeneration[] = ['roll', 'point-buy'];

/**
 * Workspace spec 079, E (Core Law table 6-0b): wealth category of the new characters of the game, or `none` (default):
 * a character created in the game gets the silver pieces of its category per level as gold coins.
 */
export const STARTING_WEALTH_SP_PER_LEVEL = {
  none: 0,
  'very-poor': 2,
  poor: 10,
  modest: 20,
  rich: 30,
  'very-rich': 50,
} as const;
export type StartingWealth = keyof typeof STARTING_WEALTH_SP_PER_LEVEL;
export const STARTING_WEALTHS = Object.keys(STARTING_WEALTH_SP_PER_LEVEL) as StartingWealth[];
export const DEFAULT_STARTING_WEALTH: StartingWealth = 'none';

export const DEFAULT_INTENSE_TRAINING = false;
export const DEFAULT_ALLOW_SAVING_DEV_POINTS = false;
export const DEFAULT_TALENT_POLICY: TalentPolicy = 'free';
export const DEFAULT_BONUS_DEV_POINTS_CAP_AT_CREATION = false;
export const DEFAULT_STAT_GENERATION: StatGeneration = 'roll';
export const DEFAULT_OPEN_ROUNDS = true;
export const DEFAULT_TALENT_PURCHASE_RULES = false;

export class GameOptions {
  constructor(
    public readonly experienceMultiplier: number,
    public readonly fatigueMultiplier: number,
    public readonly boardScaleMultiplier: number,
    public readonly letality: number,
    // Intense training (workspace spec 076, A1): one skill per level may take more than two ranks, all at the second cost.
    // Replaces allowThirdRank, still read from old documents and accepted as an input alias
    public readonly intenseTraining?: boolean,
    public readonly talentPolicy?: TalentPolicy,
    // When true the bonus development points per level limit also applies to talents bought at creation
    public readonly bonusDevPointsCapAtCreation?: boolean,
    public readonly statGeneration?: StatGeneration,
    // Open rounds: an action still unresolved at the end of a round carries over to the next one, keeping its action points
    public readonly openRounds?: boolean,
    // Workspace spec 076, A5: the game master allows keeping unspent normal development points for the next level
    public readonly allowSavingDevPoints?: boolean,
    // Workspace spec 077, C11: the optional purchase rules of the Character Companion (prerequisites per tier, flaws
    // that hinder, linked flaws and the limit of loose flaws) are checked when talents and flaws are bought
    public readonly talentPurchaseRules?: boolean,
    // Workspace spec 079, E: wealth category of the new characters (table 6-0b)
    public readonly startingWealth?: StartingWealth,
  ) {}
}

export type ResolvedGameOptions = Required<GameOptions>;

export const resolveOptions = (options: Partial<GameOptions> | null | undefined): ResolvedGameOptions => ({
  experienceMultiplier: options?.experienceMultiplier ?? 1,
  fatigueMultiplier: options?.fatigueMultiplier ?? 1,
  boardScaleMultiplier: options?.boardScaleMultiplier ?? 1,
  letality: options?.letality ?? 0,
  intenseTraining: options?.intenseTraining ?? DEFAULT_INTENSE_TRAINING,
  talentPolicy: options?.talentPolicy ?? DEFAULT_TALENT_POLICY,
  bonusDevPointsCapAtCreation: options?.bonusDevPointsCapAtCreation ?? DEFAULT_BONUS_DEV_POINTS_CAP_AT_CREATION,
  statGeneration: options?.statGeneration ?? DEFAULT_STAT_GENERATION,
  openRounds: options?.openRounds ?? DEFAULT_OPEN_ROUNDS,
  allowSavingDevPoints: options?.allowSavingDevPoints ?? DEFAULT_ALLOW_SAVING_DEV_POINTS,
  talentPurchaseRules: options?.talentPurchaseRules ?? DEFAULT_TALENT_PURCHASE_RULES,
  startingWealth: options?.startingWealth ?? DEFAULT_STARTING_WEALTH,
});

import { CharacterAttack } from '../value-objects/character-attack.vo.js';
import type { CharacterInfo } from '../value-objects/character-info.vo.js';
import type { CharacterPower } from '../value-objects/character-power.vo.js';
import { CharacterResistance } from '../value-objects/character-resistances.vo.js';
import { CharacterSkill } from '../value-objects/character-skill.vo.js';
import { CharacterStat, type StatKey } from '../value-objects/character-stat.vo.js';
import { CharacterDefense } from '../value-objects/character-defense.vo.js';
import { CharacterEndurance } from '../value-objects/character-endurance.vo.js';
import { CharacterEquipment, type EquipmentSlot } from '../value-objects/character-equipment.vo.js';
import { CharacterHP } from '../value-objects/character-hp.vo.js';
import { CharacterInitiative } from '../value-objects/character-initiative.vo.js';
import { CharacterMovement } from '../value-objects/character-movement.vo.js';
import { CharacterXP, isCreationLevel } from '../value-objects/character-xp.vo.js';
import type { CharacterGender, CharacterRoleplayInfo } from '../value-objects/character-roleplay-info.vo.js';
import type { CharacterStatus } from '../value-objects/character-status.vo.js';
import { randomUUID } from 'crypto';
import { Game } from '../../../games/domain/aggregates/game.js';
import { CharacterCreatedEvent, CharacterUpdatedEvent } from '../events/character.events.js';
import type { WeaponDevelopmentType } from '../value-objects/weapon-development-type.vo.js';
import { CharacterTrait, type TraitPayment } from '../value-objects/character-trait.vo.js';
import type { RaceTraitProps } from '../value-objects/race-trait-props.vo.js';
import { NamedEntity } from '../../../shared/domain/entities/named-entity.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import type { CharacterProps } from './character-props.js';
import { SkillBonus } from '../value-objects/skill-bonus.vo.js';
import { DEFAULT_RACE_DEV_POINTS_PER_LEVEL, resolvePowerLevel } from '../../../games/domain/value-objects/game-power-level.vo.js';
import {
  type DevPointsPayment,
  DevPointsSpendingService,
  type DevPointsSpendOptions,
  emptyPayment,
} from '../services/dev-points/dev-points-spending.service.js';
import { getStatGainRollRange, STAT_GAIN_DEV_POINTS_COST } from '../services/stats/stat-rules.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors/errors.js';
import type { CharacterCondition } from '../value-objects/character-condition.vo.js';
import type { HealingLogEntry, HealingLogKind } from '../value-objects/healing-log-entry.vo.js';
import type { HealthSummary } from '../value-objects/health-summary.vo.js';
import {
  type Injury,
  type InjuryPermanent,
  type InjuryRecovery,
  type InjuryTreatment,
  PENALTY_STATUSES,
} from '../value-objects/injury.vo.js';
import type { TacticalCharacterOutcome } from '../value-objects/tactical-game-outcome.vo.js';
import { HealingCalculator, type InjuryProgress } from '../services/healing/healing-calculator.js';
import { InjuryTreatmentRules } from '../services/healing/injury-treatment-rules.js';
import type { HealingTables } from '../value-objects/healing-tables.vo.js';
import { type OutcomeMergeSummary, TacticalOutcomeMerger } from '../services/healing/tactical-outcome-merger.js';
import { UNRANKED_RANK_BONUS } from '../services/skills/rank-bonus.js';
import { restPowerRecovery } from '../services/power/power-rules.js';

// A character without the skill: no ranks (Core Law table 3-0b)
export const UNRANKED_SKILL_BONUS = UNRANKED_RANK_BONUS;
export const MAX_RANKS_PER_LEVEL = 2;
export const MAX_RANKS_PER_LEVEL_WITH_THIRD_RANK = 3;

// Game values that drive development point spending
export interface DevPointsRules {
  bonusDevPointsPerLevel: number;
}

export interface SkillDevelopmentRules extends DevPointsRules {
  allowThirdRank: boolean;
}

// How a trait is paid: the spending options for talents and the pool that receives the points of flaws
export interface TraitSpending {
  spend: DevPointsSpendOptions;
  flawPool: 'normal' | 'flaw';
  onInsufficient?: () => Error;
}

export interface CultureRanks {
  skillId: string;
  specialization: string | null;
  ranks: number;
}

const DEFAULT_DEV_POINTS_RULES: DevPointsRules = { bonusDevPointsPerLevel: DEFAULT_RACE_DEV_POINTS_PER_LEVEL };
const DEFAULT_TRAIT_SPENDING: TraitSpending = { spend: DEFAULT_DEV_POINTS_RULES, flawPool: 'normal' };

/** Editable fields of an injury (game master). */
export type InjuryChanges = Partial<
  Pick<
    Injury,
    | 'type'
    | 'severity'
    | 'location'
    | 'side'
    | 'penalty'
    | 'initialPenalty'
    | 'bleeding'
    | 'bleedingControl'
    | 'flags'
    | 'description'
    | 'permanent'
    | 'status'
  >
>;

export interface RestResult {
  hpBefore: number;
  hpAfter: number;
  days: number;
  injuries: { injuryId: string; days: number; penalty: number; remainingDays: number; status: string }[];
  resolvedConditions: string[];
  /** Power points before and after the rest: null without power */
  powerBefore: number | null;
  powerAfter: number | null;
}

export const BODY_DEVELOPMENT_SKILL = 'body-development';

export class Character extends BaseAggregateRoot<CharacterProps> {
  public injuries: Injury[] = [];
  public conditions: CharacterCondition[] = [];
  public appliedTacticalGames: string[] = [];
  public importId: string | undefined = undefined;
  private pendingHealingLog: HealingLogEntry[] = [];

  private constructor(
    id: string,
    public gameId: string,
    public faction: NamedEntity,
    public name: string,
    public info: CharacterInfo,
    public roleplay: CharacterRoleplayInfo,
    public experience: CharacterXP,
    public statistics: Record<StatKey, CharacterStat>,
    public movement: CharacterMovement,
    public defense: CharacterDefense,
    public resistances: CharacterResistance[],
    public hp: CharacterHP,
    public endurance: CharacterEndurance,
    public power: CharacterPower | null,
    public initiative: CharacterInitiative,
    public skills: CharacterSkill[],
    public equipment: CharacterEquipment,
    public attacks: CharacterAttack[],
    public traits: CharacterTrait[],
    public status: CharacterStatus,
    public description: string | undefined,
    public imageUrl: string | undefined,
    public owner: string,
    public createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super(id);
  }

  static partialCreate(
    game: Game,
    faction: NamedEntity,
    name: string,
    info: CharacterInfo,
    roleplay: CharacterRoleplayInfo,
    level: number,
    weaponDevelopment: WeaponDevelopmentType[],
    statistics: Record<StatKey, CharacterStat>,
    imageUrl: string | undefined,
    owner: string,
    raceBonusDevPoints: number = 0,
  ): Character {
    if (!weaponDevelopment || weaponDevelopment.length !== 4) {
      throw new ValidationError('Invalid weapon development types');
    }
    const character = new Character(
      randomUUID(),
      game.id,
      faction,
      name,
      info,
      roleplay,
      CharacterXP.fromLevel(level, weaponDevelopment),
      statistics,
      CharacterMovement.empty(),
      CharacterDefense.empty(),
      [], // resistances
      CharacterHP.empty(),
      CharacterEndurance.empty(),
      null, // power
      new CharacterInitiative({}),
      [], // skills
      CharacterEquipment.empty(),
      [], // attacks
      [], // traits
      'partially_created',
      undefined, // description
      imageUrl,
      owner,
      new Date(),
      undefined,
    );
    // Level 0 has no development points: only the culture ranks. Level 1 grants devPoints
    const powerLevel = resolvePowerLevel(game.powerLevel);
    character.experience.devPoints = powerLevel.baseDevPoints;
    character.experience.availableDevPoints = 0;
    character.experience.availableBonusDevPoints = Math.max(0, (raceBonusDevPoints || 0) + powerLevel.creationBonusDevPoints);
    character.experience.bonusDevPointsSpentThisLevel = 0;
    character.experience.flawDevPoints = 0;
    return character;
  }

  static fromProps(props: CharacterProps): Character {
    const character = new Character(
      props.id,
      props.gameId,
      props.faction,
      props.name,
      props.info,
      props.roleplay,
      props.experience,
      props.statistics,
      props.movement,
      props.defense,
      props.resistances,
      props.hp,
      props.endurance,
      props.power,
      props.initiative,
      props.skills,
      props.equipment,
      props.attacks,
      props.traits,
      props.status,
      props.description,
      props.imageUrl,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
    character.injuries = props.injuries || [];
    character.conditions = props.conditions || [];
    character.appliedTacticalGames = props.appliedTacticalGames || [];
    character.importId = props.importId;
    return character;
  }

  updateRace(props: {
    raceName: string | undefined;
    sizeId: string | undefined;
    stats: Record<StatKey, number> | undefined;
    resistances: Map<string, number> | undefined;
    strideBonus: number | undefined;
    enduranceBonus: number | undefined;
    recoveryMultiplier?: number | undefined;
    baseHits: number | undefined;
    baseAt: number | undefined;
    skillBonuses: SkillBonus[];
  }) {
    if (props.recoveryMultiplier !== undefined && props.recoveryMultiplier !== null && props.recoveryMultiplier > 0) {
      this.info.recoveryMultiplier = props.recoveryMultiplier;
    }
    if (props.baseHits) {
      props.skillBonuses.push({ skillId: 'body-development', specialization: null, bonus: props.baseHits });
    }
    if (props.raceName) this.info.race = new NamedEntity(this.info.race.id, props.raceName);
    if (props.sizeId) this.info.sizeId = props.sizeId;
    if (props.stats) {
      for (const [stat, bonus] of Object.entries(props.stats)) {
        const statKey = stat as StatKey;
        const prev = this.statistics[statKey];
        const statModifiers = { ...prev.modifiers, racial: bonus || 0 };
        this.statistics[statKey] = CharacterStat.fromModifiers(prev.potential, prev.temporary, statModifiers);
      }
    }
    if (props.resistances) {
      for (const [resistance, bonus] of Object.entries(props.resistances)) {
        this.setupRacialResistanceBonus(resistance, (bonus as number) || 0);
      }
    }
    if (props.strideBonus !== undefined) {
      if (!this.movement.modifiers) {
        this.movement.modifiers = {} as Record<string, number>;
      }
      this.movement.modifiers['racial'] = props.strideBonus;
    }
    if (props.enduranceBonus) this.endurance.racialBonus = props.enduranceBonus;
    if (props.baseAt) {
      this.defense.armor.racialAt = props.baseAt;
    }
    this.updateRaceSkillBonuses(props.skillBonuses || []);
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  private updateRaceSkillBonuses(skillBonuses: SkillBonus[]) {
    this.skills.forEach(skill => {
      skill.racialBonus = 0;
    });
    skillBonuses.forEach(bonus => {
      const skill = this.findSkill(bonus.skillId, bonus.specialization);
      if (skill) {
        skill.racialBonus = bonus.bonus;
      } else {
        throw new ValidationError(
          `Skill with id ${bonus.skillId} and specialization ${bonus.specialization} not found for racial bonus application`,
        );
      }
    });
  }

  finishCreation(): void {
    this.status = 'created';
    this.apply(new CharacterCreatedEvent(this.getProps()));
  }

  update(props: {
    name: string | undefined;
    weight: number | undefined;
    height: number | undefined;
    age: number | undefined;
    gender: CharacterGender | undefined;
    description: string | undefined;
    imageUrl: string | undefined;
  }) {
    const { name, description, weight, height, age, gender, imageUrl } = props;
    if (name) this.name = name;
    if (description) this.description = description;
    if (weight !== undefined) this.info.weight = weight;
    if (height !== undefined) this.info.height = height;
    if (age !== undefined) this.roleplay.age = age;
    if (gender !== undefined) this.roleplay.gender = gender;
    if (imageUrl !== undefined) this.imageUrl = imageUrl;
    this.updatedAt = new Date();
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  getSkillBonus(skillId: string, specialization: string | null): number {
    const skill = this.findSkill(skillId, specialization);
    return skill ? skill.totalBonus : UNRANKED_SKILL_BONUS;
  }

  addSkill(
    skillId: string,
    specialization: string | null,
    statistics: string[],
    development: number[],
    racialBonus: number,
    categoryId?: string,
  ): void {
    if (this.skills.find(s => s.skillId === skillId && s.specialization === specialization)) {
      throw new ValidationError('Skill with the same specialization already exists');
    }
    const skill = CharacterSkill.empty(skillId, specialization, statistics, development, racialBonus, categoryId);
    this.skills.push(skill);
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  addTrait(
    traitId: string,
    traitName: string,
    isTalent: boolean,
    tier: number | undefined,
    cost: number,
    specialization: string | undefined,
    spending: TraitSpending = DEFAULT_TRAIT_SPENDING,
  ) {
    if (this.findCharacterTrait(traitId, specialization)) {
      throw new ValidationError('Trait with the same specialization already exists');
    }
    const payment = this.payTrait(cost, spending);
    this.traits.push(
      new CharacterTrait(traitId, traitName, isTalent, tier, cost, specialization, 'character', {
        ...payment,
        level: this.experience.level,
      }),
    );
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  // Raises the tier of a trait the character already has, paying the cost difference
  improveTrait(
    traitId: string,
    specialization: string | undefined,
    tier: number,
    cost: number,
    spending: TraitSpending = DEFAULT_TRAIT_SPENDING,
  ) {
    const current = this.findCharacterTrait(traitId, specialization);
    if (!current) {
      throw new ValidationError('Trait not found');
    }
    if (!current.tier || tier <= current.tier) {
      throw new ValidationError(`Trait ${traitId} tier must be greater than the current tier ${current.tier}`);
    }
    const previous = this.getTraitPayment(current);
    const payment = this.payTrait(cost - current.cost, spending);
    const level = this.experience.level;
    const paidWith: TraitPayment = {
      normal: previous.normal + payment.normal,
      bonus: previous.bonus + payment.bonus,
      flaw: previous.flaw + payment.flaw,
      cappedBonus: (previous.level === level ? previous.cappedBonus : 0) + payment.cappedBonus,
      level,
    };
    const improved = new CharacterTrait(traitId, current.traitName, current.isTalent, tier, cost, specialization, 'character', paidWith);
    this.traits = this.traits.map(t => (t === current ? improved : t));
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  deleteTrait(traitId: string, specialization: string | undefined) {
    const trait = this.findCharacterTrait(traitId, specialization);
    if (!trait) {
      if (this.traits.some(t => t.source === 'race' && this.sameTrait(t, traitId, specialization))) {
        throw new ValidationError(`Trait ${traitId} comes from the race and cannot be deleted`, 'err-trait-from-race');
      }
      throw new ValidationError('Trait not found');
    }
    const payment = this.getTraitPayment(trait);
    DevPointsSpendingService.refund(this.experience, payment, payment.level === this.experience.level);
    this.traits = this.traits.filter(t => t !== trait);
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  private payTrait(cost: number, spending: TraitSpending): DevPointsPayment {
    if (cost < 0) {
      return DevPointsSpendingService.grant(this.experience, -cost, spending.flawPool);
    }
    if (cost === 0) {
      return emptyPayment();
    }
    return DevPointsSpendingService.spend(
      this.experience,
      cost,
      spending.spend,
      spending.onInsufficient ?? (() => new ValidationError('Insufficient development points to acquire the trait')),
    );
  }

  // Traits stored before the payment was tracked were paid with normal points
  private getTraitPayment(trait: CharacterTrait): TraitPayment {
    return trait.paidWith ?? { normal: trait.cost || 0, bonus: 0, flaw: 0, cappedBonus: 0, level: this.experience.level };
  }

  // Replaces the race-sourced traits with the current race traits, at no cost
  syncRaceTraits(raceTraits: RaceTraitProps[]) {
    const characterTraits = this.traits.filter(t => t.source !== 'race');
    const raceSourced = raceTraits.map(
      t =>
        new CharacterTrait(t.traitId, t.traitName || t.traitId, t.isTalent, t.tier ?? undefined, 0, t.specialization ?? undefined, 'race'),
    );
    this.traits = [...characterTraits, ...raceSourced];
  }

  // Character-sourced trait (race traits excluded)
  findCharacterTrait(traitId: string, specialization: string | undefined): CharacterTrait | undefined {
    return this.traits.find(t => t.source !== 'race' && this.sameTrait(t, traitId, specialization));
  }

  private sameTrait(trait: CharacterTrait, traitId: string, specialization: string | undefined): boolean {
    return trait.traitId === traitId && (trait.specialization || undefined) === (specialization || undefined);
  }

  levelUpSkill(skillId: string, specialization: string | null, rules: SkillDevelopmentRules): void {
    const skill = this.findSkill(skillId, specialization);
    if (!skill) throw new ValidationError('Skill not found');

    // Culture ranks are not developed ranks and do not count towards the limit
    const maxRanks = rules.allowThirdRank ? MAX_RANKS_PER_LEVEL_WITH_THIRD_RANK : MAX_RANKS_PER_LEVEL;
    if (skill.ranksDeveloped >= maxRanks) {
      throw new ValidationError(
        `Skill ${skillId} cannot be developed more than ${maxRanks} ranks in a level`,
        'err-skill-max-ranks-per-level',
      );
    }
    // The third rank costs the same as the second one
    const cost = this.getRankCost(skill, skill.ranksDeveloped);
    const payment = DevPointsSpendingService.spend(this.experience, cost, { bonusDevPointsPerLevel: rules.bonusDevPointsPerLevel });
    const spent = skill.devPointsSpent ?? { normal: 0, bonus: 0 };
    skill.devPointsSpent = { normal: spent.normal + payment.normal, bonus: spent.bonus + payment.bonus };
    skill.ranks += 1;
    skill.ranksDeveloped += 1;
  }

  // Refunds the last developed rank: bonus points first, since they are spent after the normal ones
  levelDownSkill(skillId: string, specialization: string | null): void {
    const skill = this.findSkill(skillId, specialization);
    if (!skill) {
      throw new ValidationError('Skill not found');
    }
    if (skill.ranksDeveloped < 1) {
      throw new ValidationError('Skill cannot be downgraded below 0 ranks');
    }
    if (skill.ranks - 1 < (skill.cultureRanks || 0)) {
      throw new ValidationError(`Skill ${skillId} cannot be downgraded below its culture ranks`, 'err-skill-below-culture-ranks');
    }
    const cost = this.getRankCost(skill, skill.ranksDeveloped - 1);
    const spent = skill.devPointsSpent ?? { normal: 0, bonus: 0 };
    const bonus = Math.min(cost, spent.bonus);
    const normal = cost - bonus;
    DevPointsSpendingService.refund(this.experience, { normal, bonus, flaw: 0, cappedBonus: bonus }, true);
    skill.devPointsSpent = { normal: Math.max(0, spent.normal - normal), bonus: spent.bonus - bonus };
    skill.ranks -= 1;
    skill.ranksDeveloped -= 1;
  }

  // Applies the culture ranks at creation. The skills must already exist. No development points are spent
  applyCulture(cultureId: string, cultureRanks: CultureRanks[]): void {
    this.info.cultureId = cultureId;
    cultureRanks.forEach(entry => {
      const skill = this.findSkill(entry.skillId, entry.specialization);
      if (!skill) {
        throw new ValidationError(`Skill ${entry.skillId} not found for culture ranks`);
      }
      skill.cultureRanks = (skill.cultureRanks || 0) + entry.ranks;
      skill.ranks += entry.ranks;
    });
  }

  private getRankCost(skill: CharacterSkill, ranksDeveloped: number): number {
    const development = skill.development || [];
    const cost = development[Math.min(ranksDeveloped, 1)] ?? development[0];
    if (cost === undefined || cost === null) {
      throw new ValidationError(`Skill ${skill.skillId} has no development cost`);
    }
    return cost;
  }

  deleteSkill(skillId: string, specialization: string | null): void {
    const skill = this.findSkill(skillId, specialization);
    if (!skill) throw new ValidationError('Skill not found');

    if (skill.ranks > skill.ranksDeveloped) {
      throw new ValidationError('Cannot delete skill with ranks acquired from previous levels');
    }
    while (skill.ranksDeveloped > 0) {
      this.levelDownSkill(skillId, specialization);
    }
    this.removeSkill(skillId, specialization);
  }

  findSkill(skillId: string, specialization: string | null): CharacterSkill | null {
    const found = this.skills.find(
      s => s.skillId === skillId && (s.specialization === specialization || (!s.specialization && !specialization)),
    );
    return found || null;
  }

  removeSkill(skillId: string, specialization: string | null): void {
    if (specialization) {
      this.skills = this.skills.filter(s => s.skillId !== skillId || s.specialization !== specialization);
    } else {
      this.skills = this.skills.filter(s => s.skillId !== skillId);
    }
  }

  levelUp(force: boolean): void {
    const xp = this.experience;
    if (xp.level >= xp.availableLevel) {
      throw new ValidationError('Insufficient experience points to level up');
    }
    // Level 0 grants no development points, so leaving it never requires spending them
    if (xp.level > 0 && xp.availableDevPoints > 0 && !force) {
      throw new ValidationError('Character has unused development points. To level up regardless of points, use the option force=true');
    }
    // Points returned by flaws at level 0 are kept for level 1
    const carried = xp.level === 0 ? Math.max(0, xp.availableDevPoints || 0) : 0;
    xp.level += 1;
    xp.availableDevPoints = xp.devPoints + carried;
    // Unspent bonus points are kept, the per level limit starts again
    xp.bonusDevPointsSpentThisLevel = 0;
    xp.availableStatLevelUp = xp.level > 1 ? 2 : 0;
    xp.developedStatLevelUp = 0;
    this.skills.forEach(s => {
      s.ranksDeveloped = 0;
      s.devPointsSpent = { normal: 0, bonus: 0 };
    });
  }

  isInCreation(): boolean {
    return isCreationLevel(this.experience.level);
  }

  unequipItem(itemId: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const equippedSlot = Object.entries(this.equipment.slots).find(([_, item]) => item === itemId);
    if (!equippedSlot) {
      throw new ValidationError('Item not equipped');
    }
    const slotName = equippedSlot[0] as EquipmentSlot;
    this.equipment.slots[slotName] = null;
  }

  // Applies a stat gain roll. Without free stat gains left, the extra roll costs development points
  updateTemporaryStat(stat: StatKey, roll: number, rules: DevPointsRules = DEFAULT_DEV_POINTS_RULES) {
    const c = this.statistics[stat];
    if (!c) {
      throw new ValidationError('Stat not found');
    }
    const range = getStatGainRollRange(c.temporary);
    if (roll < range.min || roll > range.max) {
      throw new ValidationError(
        `Stat gain roll ${roll} is out of range ${range.min}-${range.max} for a temporary value of ${c.temporary}`,
        'err-stat-gain-roll-out-of-range',
      );
    }
    if (this.experience.availableStatLevelUp > 0) {
      this.experience.availableStatLevelUp -= 1;
    } else {
      DevPointsSpendingService.spend(
        this.experience,
        STAT_GAIN_DEV_POINTS_COST,
        { bonusDevPointsPerLevel: rules.bonusDevPointsPerLevel },
        () => new ValidationError('No available temporary stat level ups or development points to increase the stat'),
      );
      this.experience.developedStatLevelUp += 1;
    }
    c.temporary = Math.min(c.potential, c.temporary + roll);
  }

  // Health (spec 013)

  get healthSummary(): HealthSummary {
    const withPenalty = this.injuries.filter(i => PENALTY_STATUSES.includes(i.status));
    const notHealed = this.injuries.filter(i => i.status !== 'healed');
    return {
      injuryPenalty: withPenalty.reduce((acc, i) => acc + (i.penalty || 0), 0),
      activeInjuries: this.injuries.filter(i => i.status === 'active' || i.status === 'recovering').length,
      bleeding: notHealed.reduce((acc, i) => acc + (i.bleeding || 0), 0),
    };
  }

  /** Hits below 0 at which the character dies: the Body Development bonus (the maximum hits without it). */
  get deathThreshold(): number {
    const bodyDevelopment = this.findSkill(BODY_DEVELOPMENT_SKILL, null);
    return bodyDevelopment ? bodyDevelopment.totalBonus : this.hp.max;
  }

  get bodyDevelopmentRanks(): number {
    return this.findSkill(BODY_DEVELOPMENT_SKILL, null)?.ranks ?? 0;
  }

  get recoveryMultiplier(): number {
    return this.info.recoveryMultiplier && this.info.recoveryMultiplier > 0 ? this.info.recoveryMultiplier : 1;
  }

  findInjury(injuryId: string): Injury {
    const injury = this.injuries.find(i => i.id === injuryId);
    if (!injury) throw new NotFoundError('Injury', injuryId, 'err-injury-not-found');
    return injury;
  }

  private replaceInjury(injury: Injury): Injury {
    this.injuries = this.injuries.map(i => (i.id === injury.id ? injury : i));
    return injury;
  }

  private touch(): void {
    this.updatedAt = new Date();
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  addInjury(injury: Injury): Injury {
    if (this.injuries.some(i => i.id === injury.id)) {
      throw new ValidationError(`Injury ${injury.id} already exists`, 'err-injury-already-exists');
    }
    this.injuries.push(injury);
    this.recordHealing(
      'manual',
      { action: 'injury-added', type: injury.type, severity: injury.severity, penalty: injury.penalty },
      {
        injuryId: injury.id,
      },
    );
    this.touch();
    return injury;
  }

  updateInjury(injuryId: string, changes: InjuryChanges): Injury {
    const injury = this.findInjury(injuryId);
    const now = new Date().toISOString();
    const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) as InjuryChanges;
    const updated: Injury = { ...injury, ...defined, updatedAt: now };
    if (defined.status === 'healed' && injury.status !== 'healed') {
      updated.healedAt = now;
      updated.penalty = 0;
      updated.bleeding = injury.bleeding ? 0 : injury.bleeding;
    }
    if (defined.status === 'permanent' && defined.penalty === undefined) {
      updated.penalty = updated.permanent?.penalty ?? injury.initialPenalty;
      updated.permanent = updated.permanent ?? { penalty: injury.initialPenalty };
    }
    if (updated.penalty > 0) updated.penalty = -updated.penalty;
    if (updated.initialPenalty > 0) updated.initialPenalty = -updated.initialPenalty;
    this.replaceInjury(updated);
    this.recordHealing('manual', { action: 'injury-updated', changes: defined }, { injuryId });
    this.touch();
    return updated;
  }

  private assertTreatable(injury: Injury): void {
    if (injury.status === 'healed') {
      throw new ValidationError(`Injury ${injury.id} is already healed`, 'err-injury-healed');
    }
  }

  /**
   * Stores a treatment and applies it to the injury (spec 022): see InjuryTreatmentRules. An absolute failure worsens
   * the penalty and its recovery base by `penaltyWorsening`.
   */
  addInjuryTreatment(injuryId: string, treatment: InjuryTreatment, tables: HealingTables, penaltyWorsening = 0): Injury {
    const injury = this.findInjury(injuryId);
    InjuryTreatmentRules.validate(treatment.procedure, injury, tables);
    const worsening = treatment.procedure === 'cauterize' ? 0 : Math.abs(penaltyWorsening || 0);
    const updated = InjuryTreatmentRules.apply(injury, treatment, worsening, tables);
    this.replaceInjury(updated);
    const resolved = this.resolveUnconsciousIfConscious(treatment.at);
    this.recordHealing(
      'treatment',
      {
        procedure: treatment.procedure,
        roll: treatment.roll,
        total: treatment.total,
        result: treatment.result,
        healingType: treatment.healingType,
        recoveryModifier: treatment.recoveryModifier,
        difficulty: treatment.difficulty,
        penaltyWorsening: worsening,
        penalty: updated.penalty,
        bleeding: updated.bleeding,
        severity: updated.severity,
        ...(treatment.heatCritical ? { heatCritical: treatment.heatCritical } : {}),
        resolvedConditions: resolved,
      },
      { injuryId, healerName: treatment.healer.name },
    );
    this.touch();
    return updated;
  }

  setInjuryRecovery(injuryId: string, recovery: InjuryRecovery, permanentCheckRequired: boolean): Injury {
    const injury = this.findInjury(injuryId);
    this.assertTreatable(injury);
    if (injury.status === 'permanent') {
      throw new ValidationError(`Injury ${injuryId} is permanent`, 'err-injury-permanent');
    }
    if (HealingCalculator.isRecoveryRolled(injury)) {
      throw new ConflictError(`Injury ${injuryId} already has a recovery roll for its latest treatment`, 'err-injury-recovery-rolled');
    }
    const updated: Injury = { ...injury, recovery, status: 'recovering', permanent: undefined, updatedAt: recovery.startedAt };
    this.replaceInjury(updated);
    this.recordHealing('recovery-roll', { ...recovery, permanentCheckRequired }, { injuryId });
    this.touch();
    return updated;
  }

  setInjuryPermanent(injuryId: string, permanent: InjuryPermanent, summary: Record<string, unknown>): Injury {
    const injury = this.findInjury(injuryId);
    this.assertTreatable(injury);
    if (!injury.recovery) {
      throw new ValidationError(`Injury ${injuryId} has no recovery roll`, 'err-injury-recovery-required');
    }
    const now = new Date().toISOString();
    const updated: Injury = { ...injury, permanent, updatedAt: now };
    // Already recovered: the permanent part applies at once
    if (injury.recovery.remainingDays <= 0 && permanent.penalty < 0) {
      updated.status = 'permanent';
      updated.penalty = permanent.penalty;
    } else if (injury.recovery.remainingDays <= 0 && injury.status === 'permanent') {
      // An untreated injury made permanent at its end, with a late roll that leaves nothing
      updated.status = 'healed';
      updated.penalty = 0;
      updated.healedAt = now;
    }
    this.replaceInjury(updated);
    this.recordHealing('permanent-roll', { ...summary, penalty: permanent.penalty, roll: permanent.roll }, { injuryId });
    this.touch();
    return updated;
  }

  /** Passes time resting: hits per rest period and days off the injury counters. */
  rest(hpAfter: number, days: number, now: string, summary: Record<string, unknown>, powerPeriods = 0): RestResult {
    const hpBefore = this.hp.current;
    const powerBefore = this.power ? this.power.current : null;
    if (this.power) {
      const recovered = restPowerRecovery(this.power.max, powerPeriods);
      this.power = { ...this.power, current: Math.max(this.power.current, Math.min(this.power.max, this.power.current + recovered)) };
    }
    this.hp.current = Math.max(hpBefore, Math.min(this.hp.max, hpAfter));
    const progress: InjuryProgress[] = this.injuries.map(injury => HealingCalculator.advance(injury, days, now));
    this.injuries = progress.map(p => p.injury);
    const resolvedConditions = this.resolveUnconsciousIfConscious(now);
    const result: RestResult = {
      hpBefore,
      hpAfter: this.hp.current,
      days,
      injuries: progress
        .filter(p => p.days > 0)
        .map(p => ({
          injuryId: p.injury.id,
          days: p.days,
          penalty: p.injury.penalty,
          remainingDays: p.injury.recovery?.remainingDays ?? 0,
          status: p.injury.status,
        })),
      resolvedConditions,
      powerBefore,
      powerAfter: this.power ? this.power.current : null,
    };
    this.recordHealing('rest', { ...summary, ...result });
    this.touch();
    return result;
  }

  /** Spends power points (casting a spell). Not enough points is an error. */
  spendPower(amount: number): void {
    if (!this.power) throw new ValidationError(`Character ${this.id} has no power points`, 'err-no-power');
    if (amount > this.power.current) {
      throw new ValidationError(
        `Character ${this.id} has ${this.power.current} power points, ${amount} required`,
        'err-insufficient-power',
      );
    }
    this.power = { ...this.power, current: this.power.current - amount };
    this.touch();
  }

  /** Gives back power points (game master or a correction), up to the maximum. */
  restorePower(amount: number): void {
    if (!this.power) throw new ValidationError(`Character ${this.id} has no power points`, 'err-no-power');
    this.power = { ...this.power, current: Math.min(this.power.max, this.power.current + amount) };
    this.touch();
  }

  /** Resolves the unconscious conditions once the hits are above 0. */
  private resolveUnconsciousIfConscious(now: string): string[] {
    if (this.hp.current <= 0) return [];
    const resolved: string[] = [];
    this.conditions = this.conditions.map(c => {
      if (c.status !== 'unconscious' || c.resolvedAt) return c;
      resolved.push(c.id);
      return { ...c, resolvedAt: now };
    });
    return resolved;
  }

  resolveCondition(conditionId: string): CharacterCondition {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (!condition) throw new NotFoundError('Condition', conditionId, 'err-condition-not-found');
    if (condition.resolvedAt) {
      throw new ValidationError(`Condition ${conditionId} is already resolved`, 'err-condition-already-resolved');
    }
    const now = new Date().toISOString();
    const resolved = { ...condition, resolvedAt: now };
    this.conditions = this.conditions.map(c => (c.id === conditionId ? resolved : c));
    // The game master can bring a dead character back by resolving its death
    if (condition.status === 'dead' && !this.conditions.some(c => c.status === 'dead' && !c.resolvedAt)) {
      this.status = 'created';
    }
    this.recordHealing('manual', { action: 'condition-resolved', conditionId, status: condition.status });
    this.touch();
    return resolved;
  }

  isTacticalGameApplied(tacticalGameId: string): boolean {
    return this.appliedTacticalGames.includes(tacticalGameId);
  }

  /** Applies a tactical game outcome. Returns undefined when it was already applied (idempotent). */
  /** `itemsSummary`: what the outcome changed in the items of the character (spec 019), for the healing log. */
  applyTacticalOutcome(outcome: TacticalCharacterOutcome, itemsSummary?: Record<string, unknown>): OutcomeMergeSummary | undefined {
    if (this.isTacticalGameApplied(outcome.tacticalGameId)) return undefined;
    const now = new Date().toISOString();
    const { state, summary } = TacticalOutcomeMerger.merge(
      { hp: this.hp, status: this.status, injuries: this.injuries, conditions: this.conditions },
      outcome,
      this.deathThreshold,
      now,
    );
    this.hp.current = state.hp.current;
    this.status = state.status;
    this.injuries = state.injuries;
    this.conditions = state.conditions;
    this.appliedTacticalGames = [...this.appliedTacticalGames, outcome.tacticalGameId];
    this.recordHealing(
      'tactical-outcome',
      {
        ...summary,
        tacticalGameName: outcome.tacticalGameName,
        actorId: outcome.actorId,
        // Spec 013, §1.1: the hits log stays out of the character, its totals go to the healing log.
        ...(outcome.hpBySource ? { hpBySource: outcome.hpBySource } : {}),
        ...(outcome.hpLog ? { hpLogEntries: outcome.hpLog.length } : {}),
        ...(itemsSummary ?? {}),
      },
      {
        tacticalGameId: outcome.tacticalGameId,
      },
    );
    this.touch();
    return summary;
  }

  private recordHealing(
    kind: HealingLogKind,
    summary: Record<string, unknown>,
    extra: Partial<Pick<HealingLogEntry, 'injuryId' | 'tacticalGameId' | 'healerName'>> = {},
  ): void {
    this.pendingHealingLog.push({ id: randomUUID(), at: new Date().toISOString(), kind, summary, ...extra });
  }

  /** Healing log entries produced since the last call, to be stored by the repository. */
  pullHealingLog(): HealingLogEntry[] {
    const entries = this.pendingHealingLog;
    this.pendingHealingLog = [];
    return entries;
  }

  getProps(): CharacterProps {
    return {
      id: this.id,
      gameId: this.gameId,
      faction: this.faction,
      name: this.name,
      info: this.info,
      roleplay: this.roleplay,
      experience: this.experience,
      statistics: this.statistics,
      movement: this.movement,
      defense: this.defense,
      resistances: this.resistances,
      hp: this.hp,
      endurance: this.endurance,
      power: this.power,
      initiative: this.initiative,
      skills: this.skills,
      equipment: this.equipment,
      attacks: this.attacks,
      traits: this.traits,
      status: this.status,
      injuries: this.injuries,
      conditions: this.conditions,
      appliedTacticalGames: this.appliedTacticalGames,
      description: this.description,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(this.importId ? { importId: this.importId } : {}),
    };
  }

  private setupRacialResistanceBonus(resistance: string, bonus: number): void {
    const found = this.resistances.some(r => r.resistance === resistance);
    if (found) {
      return;
    }
    this.resistances.push(new CharacterResistance(resistance, 0, bonus, 0, 0, 0, 0));
  }
}

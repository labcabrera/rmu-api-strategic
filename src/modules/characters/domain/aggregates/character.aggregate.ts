import { CharacterAttack } from '../value-objects/character-attack.vo';
import { CharacterInfo } from '../value-objects/character-info.vo';
import { CharacterPower } from '../value-objects/character-power.vo';
import { CharacterResistance } from '../value-objects/character-resistances.vo';
import { CharacterSkill } from '../value-objects/character-skill.vo';
import { CharacterStat, StatKey } from '../value-objects/character-stat.vo';
import { CharacterDefense } from '../value-objects/character-defense.vo';
import { CharacterEndurance } from '../value-objects/character-endurance.vo';
import { CharacterEquipment } from '../value-objects/character-equipment.vo';
import { CharacterHP } from '../value-objects/character-hp.vo';
import { CharacterInitiative } from '../value-objects/character-initiative.vo';
import { CharacterMovement } from '../value-objects/character-movement.vo';
import { CharacterXP, isCreationLevel } from '../value-objects/character-xp.vo';
import { CharacterGender, CharacterRoleplayInfo } from '../value-objects/character-roleplay-info.vo';
import { CharacterStatus } from '../value-objects/character-status.vo';
import { randomUUID } from 'crypto';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { CharacterCreatedEvent, CharacterUpdatedEvent } from '../events/character.events';
import { WeaponDevelopmentType } from '../value-objects/weapon-development-type.vo';
import { CharacterTrait, TraitPayment } from '../value-objects/character-trait.vo';
import { RaceTraitProps } from '../value-objects/race-trait-props.vo';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { BaseAggregateRoot } from 'src/modules/shared/domain/aggregates/base-aggregate';
import { CharacterProps } from './character-props';
import { SkillBonus } from '../value-objects/skill-bonus.vo';
import { DEFAULT_RACE_DEV_POINTS_PER_LEVEL, resolvePowerLevel } from 'src/modules/games/domain/value-objects/game-power-level.vo';
import {
  DevPointsPayment,
  DevPointsSpendingService,
  DevPointsSpendOptions,
  emptyPayment,
} from '../services/dev-points/dev-points-spending.service';
import { getStatGainRollRange, STAT_GAIN_DEV_POINTS_COST } from '../services/stats/stat-rules';

export const UNRANKED_SKILL_BONUS = -20;
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

export class Character extends BaseAggregateRoot<CharacterProps> {
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
    return character;
  }

  updateRace(props: {
    raceName: string | undefined;
    sizeId: string | undefined;
    stats: Record<StatKey, number> | undefined;
    resistances: Map<string, number> | undefined;
    strideBonus: number | undefined;
    enduranceBonus: number | undefined;
    baseHits: number | undefined;
    baseAt: number | undefined;
    skillBonuses: SkillBonus[];
  }) {
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
        this.setupRacialResistanceBonus(resistance, bonus || 0);
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

  addSkill(skillId: string, specialization: string | null, statistics: string[], development: number[], racialBonus: number): void {
    if (this.skills.find(s => s.skillId === skillId && s.specialization === specialization)) {
      throw new ValidationError('Skill with the same specialization already exists');
    }
    const skill = CharacterSkill.empty(skillId, specialization, statistics, development, racialBonus);
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
    const slotName = equippedSlot[0];
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
      description: this.description,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
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

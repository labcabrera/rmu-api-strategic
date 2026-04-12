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
import { CharacterXP } from '../value-objects/character-xp.vo';
import { CharacterGender, CharacterRoleplayInfo } from '../value-objects/character-roleplay-info.vo';
import { CharacterStatus } from '../value-objects/character-status.vo';
import { randomUUID } from 'crypto';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { CharacterCreatedEvent, CharacterUpdatedEvent } from '../events/character.events';
import { WeaponDevelopmentType } from '../value-objects/weapon-development-type.vo';
import { CharacterTrait } from '../value-objects/character-trait.vo';
import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { BaseAggregateRoot } from 'src/modules/shared/domain/aggregates/base-aggregate';
import { CharacterProps } from './character-props';
import { SkillBonus } from '../value-objects/skill-bonus.vo';

export const UNRANKED_SKILL_BONUS = -20;

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
    public power: CharacterPower | undefined,
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
      undefined, // power
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
    character.experience.developmentPoints = game.powerLevel.baseDevPoints || 60;
    character.experience.availableDevelopmentPoints = game.powerLevel.baseDevPoints || 60;
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
    this.skills.forEach((skill) => {
      skill.racialBonus = 0;
    });
    skillBonuses.forEach((bonus) => {
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
    if (this.skills.find((s) => s.skillId === skillId && s.specialization === specialization)) {
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
  ) {
    if (this.traits.find((t) => t.traitId === traitId && t.specialization === specialization)) {
      throw new ValidationError('Trait with the same specialization already exists');
    }
    if (cost > 0 && this.experience.availableDevelopmentPoints < cost) {
      throw new ValidationError('Insufficient development points to acquire the trait');
    }
    this.traits.push(new CharacterTrait(traitId, traitName, isTalent, tier, cost, specialization));
    this.experience.availableDevelopmentPoints -= cost;
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  deleteTrait(traitId: string, specialization: string | undefined) {
    const trait = this.traits.find((t) => t.traitId === traitId && t.specialization === specialization);
    if (!trait) {
      throw new ValidationError('Trait not found');
    }
    this.traits = this.traits.filter((t) => !(t.traitId === traitId && t.specialization === specialization));
    this.experience.availableDevelopmentPoints += trait.cost;
    this.apply(new CharacterUpdatedEvent(this.getProps()));
  }

  levelUpSkill(skillId: string, specialization: string | null, allowThird: boolean): void {
    const skill = this.findSkill(skillId, specialization);
    if (!skill) throw new ValidationError('Skill not found');

    if (skill.ranksDeveloped > 2 && !allowThird) {
      throw new ValidationError('Skill cannot be developed beyond 2 ranks in this game');
    }
    const indexCost = Math.min(skill.ranksDeveloped, 1);
    const cost = skill.development[indexCost];
    if (this.experience.availableDevelopmentPoints < cost) {
      throw new ValidationError('Insufficient development points');
    }
    skill.ranks += 1;
    skill.ranksDeveloped += 1;
    this.experience.availableDevelopmentPoints -= cost;
  }

  levelDownSkill(skillId: string, specialization: string | null): void {
    const skill = this.findSkill(skillId, specialization);
    if (!skill) {
      throw new ValidationError('Skill not found');
    }
    if (skill.ranksDeveloped < 1) {
      throw new ValidationError('Skill cannot be downgraded below 0 ranks');
    }
    const indexCost = skill.ranksDeveloped === 1 ? 0 : 1;
    const cost = skill.development[indexCost];
    skill.ranks -= 1;
    skill.ranksDeveloped -= 1;
    this.experience.availableDevelopmentPoints += cost;
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
      (s) => s.skillId === skillId && (s.specialization === specialization || (!s.specialization && !specialization)),
    );
    return found || null;
  }

  removeSkill(skillId: string, specialization: string | null): void {
    if (specialization) {
      this.skills = this.skills.filter((s) => s.skillId !== skillId || s.specialization !== specialization);
    } else {
      this.skills = this.skills.filter((s) => s.skillId !== skillId);
    }
  }

  levelUp(force: boolean): void {
    if (this.experience.level >= this.experience.availableLevel) {
      throw new ValidationError('Insufficient experience points to level up');
    }
    if (this.experience.availableDevelopmentPoints > 0 && !force) {
      throw new ValidationError('Character has unused development points. To level up regardless of points, use the option force=true');
    }
    this.experience.level += 1;
    this.experience.availableDevelopmentPoints = this.experience.developmentPoints;
    this.skills.forEach((s) => (s.ranksDeveloped = 0));
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
    const found = this.resistances.some((r) => r.resistance === resistance);
    if (found) {
      return;
    }
    this.resistances.push(new CharacterResistance(resistance, 0, bonus, 0, 0));
  }
}

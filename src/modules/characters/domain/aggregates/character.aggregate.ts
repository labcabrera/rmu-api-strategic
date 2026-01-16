import { AggregateRoot } from '@nestjs/cqrs';
import { CharacterAttack } from '../value-objects/character-attack.vo';
import { CharacterInfo } from '../value-objects/character-info.vo';
import { CharacterItem } from '../value-objects/character-item.vo';
import { CharacterPower } from '../value-objects/character-power.vo';
import { CharacterResistance } from '../value-objects/character-resistances.vo';
import { CharacterSkill } from '../value-objects/character-skill.vo';
import { CharacterStatistics } from '../value-objects/character-statistics.vo';
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
import { ValidationError } from 'src/modules/shared/domain/errors';
import { WeaponDevelopmentType } from '../value-objects/weapon-development-type.vo';
import { DomainEvent } from 'src/modules/shared/domain/events/domain-event';
import { CharacterTrait } from '../value-objects/character-trait.vo';
import { NamedId } from 'src/modules/shared/domain/entities/named-id.entity';

export interface CharacterProps {
  id: string;
  gameId: string;
  faction: NamedId;
  name: string;
  info: CharacterInfo;
  roleplay: CharacterRoleplayInfo;
  experience: CharacterXP;
  statistics: CharacterStatistics;
  movement: CharacterMovement;
  defense: CharacterDefense;
  resistances: CharacterResistance[];
  hp: CharacterHP;
  endurance: CharacterEndurance;
  power: CharacterPower | undefined;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  items: CharacterItem[];
  equipment: CharacterEquipment;
  attacks: CharacterAttack[];
  traits: CharacterTrait[];
  status: CharacterStatus;
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export class Character extends AggregateRoot<DomainEvent<CharacterProps>> {
  private constructor(
    public id: string,
    public gameId: string,
    public faction: NamedId,
    public name: string,
    public info: CharacterInfo,
    public roleplay: CharacterRoleplayInfo,
    public experience: CharacterXP,
    public statistics: CharacterStatistics,
    public movement: CharacterMovement,
    public defense: CharacterDefense,
    public resistances: CharacterResistance[],
    public hp: CharacterHP,
    public endurance: CharacterEndurance,
    public power: CharacterPower | undefined,
    public initiative: CharacterInitiative,
    public skills: CharacterSkill[],
    public items: CharacterItem[],
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
    super();
  }

  static partialCreate(
    game: Game,
    faction: NamedId,
    name: string,
    info: CharacterInfo,
    roleplay: CharacterRoleplayInfo,
    level: number,
    weaponDevelopment: WeaponDevelopmentType[],
    statistics: CharacterStatistics,
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
      CharacterInitiative.empty(),
      [], // skills
      [], // items
      CharacterEquipment.empty(),
      [], // attacks
      [], // traits
      'partially_created',
      undefined, // description
      undefined, // imageUrl
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
      props.items,
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
    stats: Map<string, number> | undefined;
    resistances: Map<string, number> | undefined;
    strideBonus: number | undefined;
    enduranceBonus: number | undefined;
    baseHits: number | undefined;
    baseAt: number | undefined;
  }) {
    if (props.raceName) this.info.raceName = props.raceName;
    if (props.sizeId) this.info.sizeId = props.sizeId;
    if (props.stats) {
      for (const [stat, bonus] of Object.entries(props.stats)) {
        this.statistics[stat as keyof CharacterStatistics].racial = bonus || 0;
      }
    }
    if (props.resistances) {
      for (const [resistance, bonus] of Object.entries(props.resistances)) {
        this.setupRacialResistanceBonus(resistance, bonus || 0);
      }
    }
    if (props.strideBonus) this.movement.strideRacialBonus = props.strideBonus;
    if (props.enduranceBonus) this.endurance.racialBonus = props.enduranceBonus;
    if (props.baseHits) {
      const bodyDevSkill = this.skills.find((s) => s.skillId === 'body-development');
      if (bodyDevSkill) {
        bodyDevSkill.racialBonus = props.baseHits;
      }
    }
    if (props.baseAt) {
      this.defense.armor.racialAt = props.baseAt;
    }
    this.apply(new CharacterUpdatedEvent(this.getProps()));
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

  addSkill(
    skillId: string,
    specialization: string | undefined,
    statistics: string[],
    development: number[],
    racialBonus: number,
  ): void {
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

  levelUpSkill(skillId: string, allowThird: boolean): void {
    const skill = this.skills.find((s) => s.skillId === skillId);
    if (!skill) {
      throw new ValidationError('Skill not found');
    }
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

  levelDownSkill(skillId: string): void {
    const skill = this.skills.find((s) => s.skillId === skillId);
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

  deleteSkill(skillId: string) {
    const skill = this.skills.find((s) => s.skillId === skillId);
    if (!skill) {
      throw new ValidationError('Skill not found');
    }
    if (skill.ranks > skill.ranksDeveloped) {
      throw new ValidationError('Cannot delete skill with ranks acquired from previous levels');
    }
    while (skill.ranksDeveloped > 0) {
      this.levelDownSkill(skillId);
    }
    this.skills = this.skills.filter((s) => s.skillId !== skillId);
  }

  levelUp(force: boolean): void {
    if (this.experience.level >= this.experience.availableLevel) {
      throw new ValidationError('Insufficient experience points to level up');
    }
    if (this.experience.availableDevelopmentPoints > 0 && !force) {
      throw new ValidationError(
        'Character has unused development points. To level up regardless of points, use the option force=true',
      );
    }
    this.experience.level += 1;
    this.experience.availableDevelopmentPoints = this.experience.developmentPoints;
    this.skills.forEach((s) => (s.ranksDeveloped = 0));
  }

  addItem(item: CharacterItem): void {
    if (item.stackable) {
      const amount = item.amount || 1;
      if (amount < 1) {
        throw new ValidationError('Item amount must be at least 1');
      }
      const existing = this.items.find((i) => i.itemTypeId === item.itemTypeId && i.name === item.name);
      if (existing) {
        existing.amount = (existing.amount || 0) + amount;
      } else {
        this.items.push(item);
      }
    } else {
      if (item.amount && item.amount > 1) {
        throw new ValidationError('Non-stackable items cannot have amount greater than 1');
      }
      item.amount = undefined;
      this.items.push(item);
    }
    this.apply(new CharacterUpdatedEvent(this.getProps()));
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
      items: this.items,
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

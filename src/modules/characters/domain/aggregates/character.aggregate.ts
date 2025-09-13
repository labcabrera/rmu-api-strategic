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
import { CharacterRoleplayInfo } from '../value-objects/character-roleplay-info.vo';
import { CharacterStatus } from '../value-objects/character-status.vo';
import { randomUUID } from 'crypto';
import { Game } from 'src/modules/games/domain/aggregates/game.aggregate';
import { CharacterCreatedEvent } from '../events/character.events';
import { ValidationError } from 'src/modules/shared/domain/errors';

export type WeaponDevelopmentType = 'melee' | 'ranged' | 'shield' | 'unarmed';

export class Character extends AggregateRoot {
  constructor(
    public id: string,
    public gameId: string,
    public factionId: string,
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
    public status: CharacterStatus | undefined,
    public description: string | undefined,
    public owner: string,
    public createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }

  static partialCreate(
    game: Game,
    factionId: string,
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
      factionId,
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
      'partially_created',
      undefined, // description
      owner,
      new Date(),
      undefined,
    );
    character.experience.developmentPoints = game.powerLevel.baseDevPoints || 60;
    character.experience.availableDevelopmentPoints = game.powerLevel.baseDevPoints || 60;
    return character;
  }

  setupRaceBonuses(
    statBonus: Record<string, number>,
    resistances: Record<string, number>,
    size: string,
    strideBonus: number,
    enduranceBonus: number,
  ): void {
    this.movement.strideRacialBonus = strideBonus;
    for (const [stat, bonus] of Object.entries(statBonus)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.statistics[stat].racial = bonus;
    }
    for (const [resistance, bonus] of Object.entries(resistances)) {
      this.setupRacialResistanceBonus(resistance, bonus);
    }
    this.endurance.racialBonus = enduranceBonus;
    this.info.sizeId = size;
  }

  finishCreation(): void {
    this.status = 'created';
    this.apply(new CharacterCreatedEvent(this));
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
  }

  toPlainObject(): any {
    return {
      gameId: this.gameId,
      factionId: this.factionId,
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
      status: this.status,
      description: this.description,
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

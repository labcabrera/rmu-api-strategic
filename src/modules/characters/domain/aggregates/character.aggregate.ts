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
    gameId: string,
    factionId: string,
    name: string,
    info: CharacterInfo,
    roleplay: CharacterRoleplayInfo,
    level: number,
    statistics: CharacterStatistics,
    description: string | undefined,
    owner: string,
  ): Character {
    return new Character(
      randomUUID(),
      gameId,
      factionId,
      name,
      info,
      roleplay,
      CharacterXP.fromLevel(level),
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
      description,
      owner,
      new Date(),
      undefined,
    );
  }
}

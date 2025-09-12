import { AggregateRoot } from '@nestjs/cqrs';
import { CharacterAttack } from '../value-objects/character-attack.vo';
import { CharacterDefense } from '../value-objects/character-defense.vo';
import { CharacterEndurance } from '../value-objects/character-endurance.vo';
import { CharacterEquipment } from '../value-objects/character-equipment.vo';
import { CharacterHP } from '../value-objects/character-hp.vo';
import { CharacterInfo } from '../value-objects/character-info.vo';
import { CharacterInitiative } from '../value-objects/character-initiative.vo';
import { CharacterItem } from '../value-objects/character-item.vo';
import { CharacterMovement } from '../value-objects/character-movement.vo';
import { CharacterPower } from '../value-objects/character-power.vo';
import { CharacterResistance } from '../value-objects/character-resistances.vo';
import { CharacterRoleplayInfo } from '../value-objects/character-roleplay-info.vo';
import { CharacterSkill } from '../value-objects/character-skill.vo';
import { CharacterStatistics } from '../value-objects/character-statistics.vo';
import { CharacterXP } from '../value-objects/character-xp.entity';

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
    public status: string | undefined,
    public description: string | undefined,
    public owner: string,
    public createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }
}

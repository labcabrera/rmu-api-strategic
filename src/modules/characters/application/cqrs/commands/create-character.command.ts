import { CharacterInfo } from 'src/modules/characters/domain/value-objects/character-info.vo';
import { CharacterRoleplayInfo } from 'src/modules/characters/domain/value-objects/character-roleplay-info.vo';
import { CharacterStatistics } from 'src/modules/characters/domain/value-objects/character-statistics.vo';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';

export class CreateCharacterCommand {
  constructor(
    public readonly gameId: string,
    public readonly factionId: string,
    public readonly name: string,
    public readonly info: Omit<CharacterInfo, 'raceName'>,
    public readonly roleplay: CharacterRoleplayInfo,
    public readonly level: number,
    public readonly weaponDevelopment: WeaponDevelopmentType[],
    public readonly statistics: CharacterStatistics,
    public readonly strideCustomBonus: number | undefined,
    public readonly enduranceCustomBonus: number | undefined,
    public readonly initiativeCustomBonus: number | undefined,
    public readonly skills: CreateCharacterSkill[],
    public readonly items: CreateCharacterItem[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export interface CreateCharacterExperience {
  level: number;
  xp: number;
}

export interface CreateCharacterSkill {
  skillId: string;
  specialization: string | undefined;
}

export interface CreateCharacterItem {
  name: string | undefined;
  itemTypeId: string;
}

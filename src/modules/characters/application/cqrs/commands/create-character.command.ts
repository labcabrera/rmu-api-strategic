import type { CharacterRealm } from 'src/modules/characters/domain/value-objects/character-realm.vo';
import { CharacterRoleplayInfo } from 'src/modules/characters/domain/value-objects/character-roleplay-info.vo';
import { CharacterStatistics } from 'src/modules/characters/domain/value-objects/character-statistics.vo';
import { WeaponDevelopmentType } from 'src/modules/characters/domain/value-objects/weapon-development-type.vo';

export class CreateCharacterCommand {
  constructor(
    public readonly gameId: string,
    public readonly faction: string,
    public readonly name: string,
    public readonly info: CreateCharacterInfo,
    public readonly roleplay: CharacterRoleplayInfo,
    public readonly level: number,
    public readonly weaponDevelopment: WeaponDevelopmentType[],
    public readonly statistics: CharacterStatistics,
    public readonly skills: CreateCharacterSkill[],
    public readonly imageUrl: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class CreateCharacterInfo {
  constructor(
    public readonly raceId: string,
    public readonly professionId: string,
    public readonly sizeId: string,
    public readonly realmType: CharacterRealm,
    public readonly height: number,
    public readonly weight: number,
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

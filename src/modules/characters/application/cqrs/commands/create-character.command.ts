import type { CharacterRealm } from '../../../domain/value-objects/character-realm.vo.js';
import type { CharacterRoleplayInfo } from '../../../domain/value-objects/character-roleplay-info.vo.js';
import type { StatKey } from '../../../domain/value-objects/character-stat.vo.js';
import type { WeaponDevelopmentType } from '../../../domain/value-objects/weapon-development-type.vo.js';

export class CreateCharacterCommand {
  constructor(
    public readonly gameId: string,
    public readonly faction: string,
    public readonly name: string,
    public readonly info: CreateCharacterInfo,
    public readonly roleplay: CharacterRoleplayInfo,
    public readonly level: number,
    public readonly weaponDevelopment: WeaponDevelopmentType[],
    public readonly statistics: Record<StatKey, CharacterStatCreation>,
    public readonly skills: CreateCharacterSkill[],
    public readonly imageUrl: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
    public readonly culture?: CreateCharacterCulture,
  ) {}
}

// Culture chosen at creation. 'skill' entries are applied automatically; the other entries need assignments
export interface CreateCharacterCulture {
  cultureId: string;
  assignments: CreateCharacterCultureAssignment[];
}

export interface CreateCharacterCultureAssignment {
  // Index of the entry in culture.skillRanks
  entry: number;
  skillId: string;
  specialization?: string | null;
  ranks: number;
}

export class CharacterStatCreation {
  constructor(
    public readonly potential: number,
    public readonly temporary: number,
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
  specialization: string | null;
}

export interface CreateCharacterItem {
  name: string | undefined;
  itemTypeId: string;
}

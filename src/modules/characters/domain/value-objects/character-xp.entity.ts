import { WeaponDevelopmentType } from '../aggregates/character.aggregate';

export interface CharacterXP {
  level: number;
  availableLevel: number;
  xp: number;
  developmentPoints: number;
  availableDevelopmentPoints: number;
  weaponDevelopment: WeaponDevelopmentType[];
}

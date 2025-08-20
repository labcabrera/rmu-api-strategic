import { WeaponDevelopmentType } from './character.entity';

export interface CharacterXP {
  level: number;
  availableLevel: number;
  xp: number;
  developmentPoints: number;
  availableDevelopmentPoints: number;
  weaponDevelopment: WeaponDevelopmentType[];
}

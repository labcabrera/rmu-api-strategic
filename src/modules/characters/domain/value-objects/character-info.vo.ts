import { CharacterRealm } from './character-realm.vo';

export interface CharacterInfo {
  raceId: string;
  professionId: string;
  sizeId: string;
  realmType: CharacterRealm;
  height: number;
  weight: number;
}

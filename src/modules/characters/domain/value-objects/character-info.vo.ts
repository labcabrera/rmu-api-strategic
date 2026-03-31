import { NamedEntity } from 'src/modules/shared/domain/entities/named-entity';
import { CharacterRealm } from './character-realm.vo';

export interface CharacterInfo {
  race: NamedEntity;
  professionId: string;
  sizeId: string;
  realmType: CharacterRealm;
  height: number;
  weight: number;
}

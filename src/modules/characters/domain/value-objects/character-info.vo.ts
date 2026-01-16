import { CharacterRealm } from './character-realm.vo';
import { NamedId } from 'src/modules/shared/domain/entities/named-id.entity';

export interface CharacterInfo {
  race: NamedId;
  professionId: string;
  sizeId: string;
  realmType: CharacterRealm;
  height: number;
  weight: number;
}

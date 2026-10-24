import { NamedEntity } from '../../../shared/domain/entities/named-entity.js';
import type { CharacterRealm } from './character-realm.vo.js';

export interface CharacterInfo {
  race: NamedEntity;
  professionId: string;
  sizeId: string;
  realmType: CharacterRealm;
  height: number;
  weight: number;
  cultureId?: string | null;
  /** Race recovery multiplier: multiplies the recovery time of injuries (1 when unknown) */
  recoveryMultiplier?: number;
}

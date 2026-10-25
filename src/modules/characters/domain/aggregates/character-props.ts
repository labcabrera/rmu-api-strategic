import { NamedEntity } from '../../../shared/domain/entities/named-entity.js';
import { CharacterAttack } from '../value-objects/character-attack.vo.js';
import { CharacterDefense } from '../value-objects/character-defense.vo.js';
import { CharacterEndurance } from '../value-objects/character-endurance.vo.js';
import { CharacterEquipment } from '../value-objects/character-equipment.vo.js';
import { CharacterHP } from '../value-objects/character-hp.vo.js';
import type { CharacterInfo } from '../value-objects/character-info.vo.js';
import { CharacterInitiative } from '../value-objects/character-initiative.vo.js';
import { CharacterMovement } from '../value-objects/character-movement.vo.js';
import type { CharacterPower } from '../value-objects/character-power.vo.js';
import { CharacterResistance } from '../value-objects/character-resistances.vo.js';
import type { CharacterRoleplayInfo } from '../value-objects/character-roleplay-info.vo.js';
import { CharacterSkill } from '../value-objects/character-skill.vo.js';
import { CharacterStat, type StatKey } from '../value-objects/character-stat.vo.js';
import type { CharacterStatus } from '../value-objects/character-status.vo.js';
import { CharacterTrait } from '../value-objects/character-trait.vo.js';
import { CharacterXP } from '../value-objects/character-xp.vo.js';
import type { CharacterCondition } from '../value-objects/character-condition.vo.js';
import type { Injury } from '../value-objects/injury.vo.js';

export interface CharacterProps {
  id: string;
  gameId: string;
  faction: NamedEntity;
  name: string;
  info: CharacterInfo;
  roleplay: CharacterRoleplayInfo;
  experience: CharacterXP;
  statistics: Record<StatKey, CharacterStat>;
  movement: CharacterMovement;
  defense: CharacterDefense;
  resistances: CharacterResistance[];
  hp: CharacterHP;
  endurance: CharacterEndurance;
  power: CharacterPower | null;
  initiative: CharacterInitiative;
  skills: CharacterSkill[];
  equipment: CharacterEquipment;
  attacks: CharacterAttack[];
  traits: CharacterTrait[];
  status: CharacterStatus;
  injuries: Injury[];
  conditions: CharacterCondition[];
  /** Tactical games whose outcome has been applied (idempotency) */
  appliedTacticalGames: string[];
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
  /** Spec 024: the import that created it, to undo a failed import. */
  importId?: string;
}

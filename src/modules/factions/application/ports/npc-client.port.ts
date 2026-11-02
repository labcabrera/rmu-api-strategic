import type { AccessType } from '../../../shared/domain/entities/access-type.js';

/** What strategic reads of an NPC of rmu-api-npcs (workspace spec 055). */
export interface NpcResponse {
  id: string;
  name: string;
  realmId: string;
  accessType: AccessType;
  owner: string;
}

export interface NpcClientPort {
  /** Undefined when rmu-api-npcs does not have it. */
  getNpcById(npcId: string): Promise<NpcResponse | undefined>;
}

export const NPC_CLIENT = Symbol('NpcClientPort');

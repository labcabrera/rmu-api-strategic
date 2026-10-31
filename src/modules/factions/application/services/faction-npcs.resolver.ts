import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { type RealmClientPort, REALM_CLIENT } from '../../../games/application/ports/realm-client.port.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { FactionNpc } from '../../domain/value-objects/faction-npc.vo.js';
import { type NpcClientPort, type NpcResponse, NPC_CLIENT } from '../ports/npc-client.port.js';

/** An entry as a client sends it: without `id` it is new, and without `name` it takes the NPC's. */
export interface FactionNpcInput {
  id?: string;
  npcId: string;
  name?: string | null;
  count: number;
  notes?: string | null;
}

/** Who the NPCs are for: the owner of the faction and the realm of its campaign. */
export interface FactionNpcContext {
  owner: string;
  realmId: string;
}

/**
 * Checks the NPCs of a faction against rmu-api-npcs and core (workspace spec 055, decision 1). An NPC may join a
 * faction when it exists, is public or belongs to the owner of the faction, and is of the realm of the campaign or of a
 * generic realm (`generic: true` in core). Each NPC and realm is read once per call.
 */
@Injectable()
export class FactionNpcsResolver {
  constructor(
    @Inject(NPC_CLIENT) private readonly npcClient: NpcClientPort,
    @Inject(REALM_CLIENT) private readonly realmClient: RealmClientPort,
  ) {}

  /** The whole list, with an id for each new entry and the NPC's name where there is none. 400 on the first invalid NPC. */
  async resolve(entries: FactionNpcInput[], context: FactionNpcContext): Promise<FactionNpc[]> {
    const checker = this.checker(context);
    const resolved: FactionNpc[] = [];
    for (const entry of entries) {
      const result = await checker(entry.npcId);
      if (typeof result === 'string') throw new ValidationError(result);
      resolved.push({
        id: entry.id ?? randomUUID(),
        npcId: entry.npcId,
        name: entry.name?.trim() ? entry.name : result.name,
        count: entry.count,
        notes: entry.notes ?? null,
      });
    }
    return resolved;
  }

  /** A check that remembers the NPCs and realms it read: the NPC, or the reason it cannot join (the import skips it). */
  checker(context: FactionNpcContext): (npcId: string) => Promise<NpcResponse | string> {
    const npcs = new Map<string, Promise<NpcResponse | undefined>>();
    const generic = new Map<string, Promise<boolean>>();
    const isGeneric = (realmId: string) => {
      if (!generic.has(realmId))
        generic.set(
          realmId,
          this.realmClient.getRealmById(realmId).then(realm => realm?.generic === true),
        );
      return generic.get(realmId)!;
    };
    return async (npcId: string) => {
      if (!npcs.has(npcId)) npcs.set(npcId, this.npcClient.getNpcById(npcId));
      const npc = await npcs.get(npcId)!;
      if (!npc) return `NPC ${npcId} not found`;
      if (npc.accessType !== 'public' && npc.owner !== context.owner) {
        return `NPC ${npcId} is private and does not belong to the owner of the faction`;
      }
      if (npc.realmId !== context.realmId && !(await isGeneric(npc.realmId))) {
        return `NPC ${npcId} is not of the realm of the campaign nor of a generic realm`;
      }
      return npc;
    };
  }
}

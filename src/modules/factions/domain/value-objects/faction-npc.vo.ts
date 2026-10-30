/**
 * An NPC of a faction (workspace spec 055): guards, mercenaries, mounts or pets, with a number of specimens. It is a
 * reference to an NPC of rmu-api-npcs, not a copy; `name` is its alias in the campaign (the NPC's name by default).
 */
export interface FactionNpc {
  /** Id of the entry (uuid), not of the NPC. */
  id: string;
  npcId: string;
  name: string;
  count: number;
  notes: string | null;
}

export const FACTION_NPC_MIN_COUNT = 1;
export const FACTION_NPC_MAX_COUNT = 50;
/** Entries of one faction. */
export const MAX_FACTION_NPCS = 100;

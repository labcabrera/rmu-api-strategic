import { FactionManagement } from '../value-objects/faction-management.vo.js';
import type { FactionNpc } from '../value-objects/faction-npc.vo.js';

export interface FactionProps {
  id: string;
  gameId: string;
  name: string;
  management: FactionManagement;
  shortDescription: string | undefined;
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;
  /** Workspace spec 055: missing in older documents, which read as []. */
  npcs: FactionNpc[];
  /** Spec 072, decision 5: the players of the game who change the faction and what hangs from it; missing in older documents. */
  players?: string[];
  createdAt: Date;
  updatedAt: Date | undefined;
  /** Spec 024: the import that created it, to undo a failed import. */
  importId?: string;
}

export type CreateFactionProps = Omit<FactionProps, 'id' | 'createdAt' | 'updatedAt' | 'npcs' | 'players'> & { npcs?: FactionNpc[] };

export type UpdateFactionProps = Partial<Omit<FactionProps, 'id' | 'gameId' | 'management' | 'owner' | 'createdAt' | 'updatedAt'>>;

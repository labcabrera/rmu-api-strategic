import type { AccessType } from '../../../shared/domain/entities/access-type.js';
import { GameCalendar } from '../value-objects/game-calendar.vo.js';
import { GameOptions } from '../value-objects/game-options.vo.js';
import { GamePowerLevel } from '../value-objects/game-power-level.vo.js';
import type { GameStatus } from '../value-objects/game-status.vo.js';

export interface GameProps {
  id: string;
  name: string;
  realmId: string;
  realmName: string;
  status: GameStatus;
  options: GameOptions;
  powerLevel: GamePowerLevel;
  /** Workspace spec 065; games stored before it resolve to day 1 */
  calendar?: GameCalendar;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  owner: string;
  accessType: AccessType;
  createdAt: Date;
  updatedAt?: Date;
}

export type CreateGameProps = Omit<GameProps, 'id' | 'createdAt' | 'updatedAt'>;

// The calendar changes through adjustCalendar and passTime only.
export type UpdateGameProps = Partial<Omit<GameProps, 'id' | 'realmId' | 'realmName' | 'createdAt' | 'updatedAt' | 'owner' | 'calendar'>>;

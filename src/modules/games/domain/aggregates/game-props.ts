import type { AccessType } from '../../../shared/domain/entities/access-type.js';
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
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  owner: string;
  accessType: AccessType;
  createdAt: Date;
  updatedAt?: Date;
}

export type CreateGameProps = Omit<GameProps, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateGameProps = Partial<Omit<GameProps, 'id' | 'realmId' | 'realmName' | 'createdAt' | 'updatedAt' | 'owner'>>;

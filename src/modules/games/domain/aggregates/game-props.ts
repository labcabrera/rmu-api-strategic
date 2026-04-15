import { AccessType } from 'src/modules/shared/domain/entities/access-type';
import { GameOptions } from '../value-objects/game-options.vo';
import { GamePowerLevel } from '../value-objects/game-power-level.vo';
import { GameStatus } from '../value-objects/game-status.vo';

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

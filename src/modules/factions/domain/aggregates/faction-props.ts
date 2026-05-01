import { FactionManagement } from '../value-objects/faction-management.vo';

export interface FactionProps {
  id: string;
  gameId: string;
  name: string;
  management: FactionManagement;
  shortDescription: string | undefined;
  description: string | undefined;
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export type CreateFactionProps = Omit<FactionProps, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateFactionProps = Partial<Omit<FactionProps, 'id' | 'gameId' | 'owner' | 'createdAt' | 'updatedAt'>>;

export type GameStatus = 'open' | 'closed';

export interface Game {
  id: string;
  name: string;
  realm: string;
  status: GameStatus;
  description: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

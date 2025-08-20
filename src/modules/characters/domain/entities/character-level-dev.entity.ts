export interface CharacterLevelDev {
  id: string;
  characterId: string;
  level: number;
  skills: Map<string, number[]>;
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

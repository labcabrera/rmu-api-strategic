export interface CharacterLevelDev {
  id: string;
  characterId: string;
  level: number;
  skills: { [key: string]: number };
}

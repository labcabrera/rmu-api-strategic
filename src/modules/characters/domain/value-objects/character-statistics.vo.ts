export interface Stat {
  potential: number;
  temporary: number;
  bonus: number;
  racial: number;
  custom: number;
  totalBonus: number;
}

export class CharacterStatistics {
  ag: Stat;
  co: Stat;
  em: Stat;
  in: Stat;
  me: Stat;
  pr: Stat;
  qu: Stat;
  re: Stat;
  sd: Stat;
  st: Stat;
}

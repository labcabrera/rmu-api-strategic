export class Stat {
  constructor(
    public potential: number,
    public temporary: number,
    public bonus: number,
    public racial: number,
    public custom: number,
    public totalBonus: number,
  ) {}
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

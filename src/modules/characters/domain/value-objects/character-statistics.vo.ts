export type StatKey = 'ag' | 'co' | 'em' | 'in' | 'me' | 'pr' | 'qu' | 're' | 'sd' | 'st';

export const STAT_KEYS: StatKey[] = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];

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

export type CharacterStatistics = Record<StatKey, Stat>;

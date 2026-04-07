export type StatKey = 'ag' | 'co' | 'em' | 'in' | 'me' | 'pr' | 'qu' | 're' | 'sd' | 'st';
export type StatModifierKey = 'stat' | 'racial' | 'item' | 'trait';

export const STAT_KEYS: StatKey[] = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];

export class CharacterStat {
  public potential: number;
  public temporary: number;
  public modifiers: Record<StatModifierKey, number>;
  public totalBonus: number;

  constructor(potential: number, temporary: number, modifiers: Record<StatModifierKey, number>) {
    this.potential = potential;
    this.temporary = temporary;
    this.modifiers = modifiers;
    this.totalBonus = Object.values(modifiers).reduce((sum, bonus) => sum + bonus, 0);
  }
}

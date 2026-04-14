export type InitiativeModifier = 'stat' | 'trait' | 'item' | 'other';

export class CharacterInitiative {
  public modifiers: Record<InitiativeModifier, number>;
  public totalBonus: number;

  constructor(modifiers: Record<string, number>) {
    const filtered = Object.entries(modifiers).reduce(
      (acc, [k, v]) => {
        if (v !== 0) {
          acc[k as InitiativeModifier] = v;
        }
        return acc;
      },
      {} as Record<InitiativeModifier, number>,
    );
    this.modifiers = filtered;
    this.totalBonus = Object.values(filtered).reduce((sum, bonus) => sum + bonus, 0);
  }
}

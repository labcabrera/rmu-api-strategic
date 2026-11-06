export class CharacterAttackRange {
  constructor(
    public readonly from: number,
    public readonly to: number,
    /** OB modifier of the range, with the reduction of the traits already applied. */
    public readonly bonus: number,
    /**
     * Workspace spec 079, D1: the part of `bonus` that the traits gave (Deadeye reduces the range penalty), so that
     * rmu-api-tactical can show it apart without counting it twice. 0 or missing: none.
     */
    public readonly traitBonus?: number,
  ) {}
}

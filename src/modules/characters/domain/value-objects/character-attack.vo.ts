export class CharacterAttack {
  constructor(
    public attackName: string,
    public attackTable: string,
    public sizeAdjustment: number,
    public fumbleTable: string,
    public fumble: number,
    public weaponFumble: number,
    public bo: number,
    public type: string,
    public defaultAttack: boolean,
    public meleeRange: number | null,
  ) {}
}

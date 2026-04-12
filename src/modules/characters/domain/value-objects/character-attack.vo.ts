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
    public boModifiers: Record<string, number>,
  ) {}

  static fromProps(props: Omit<CharacterAttack, 'bo'>): CharacterAttack {
    const bo = Object.values(props.boModifiers).reduce((sum, bonus) => sum + bonus, 0);
    return new CharacterAttack(
      props.attackName,
      props.attackTable,
      props.sizeAdjustment,
      props.fumbleTable,
      props.fumble,
      props.weaponFumble,
      bo,
      props.type,
      props.defaultAttack,
      props.meleeRange,
      props.boModifiers,
    );
}

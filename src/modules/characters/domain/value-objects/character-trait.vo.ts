export class CharacterTrait {
  constructor(
    public readonly traitId: string,
    public readonly isTalent: boolean,
    public readonly tier: number | undefined,
    public readonly cost: number,
    public readonly value: string | undefined,
  ) {}
}

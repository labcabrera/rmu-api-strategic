export class ItemAffix {
  constructor(
    public readonly key: string,
    public readonly value: string | null,
    public readonly bonus: number | null,
    public readonly description: string | null,
  ) {}
}

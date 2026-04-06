export class ItemInfo {
  constructor(
    public readonly length: number | null,
    public readonly weight: number,
    public readonly strength: number | null,
    public stackable: boolean,
  ) {}
}

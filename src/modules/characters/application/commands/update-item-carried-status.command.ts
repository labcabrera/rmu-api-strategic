export class UpdateItemCarriedStatusCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    public readonly carried: boolean,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

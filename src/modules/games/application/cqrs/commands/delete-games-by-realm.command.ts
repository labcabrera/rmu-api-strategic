export class DeleteGamesByRealmCommand {
  constructor(
    public readonly realmId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

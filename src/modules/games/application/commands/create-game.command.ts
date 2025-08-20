export class CreateGameCommand {
  constructor(
    public readonly name: string,
    public readonly realm: string,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

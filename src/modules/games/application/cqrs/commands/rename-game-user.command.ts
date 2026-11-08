/** A user changed their name: the members and join requests of the games that keep a copy of it follow. */
export class RenameGameUserCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
  ) {}
}

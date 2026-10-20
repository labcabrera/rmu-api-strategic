import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class UpdateItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly name: string | undefined,
    public readonly wielderSize: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

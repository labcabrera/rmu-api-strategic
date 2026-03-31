import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class DeleteTraitCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly traitId: string,
    public readonly specialization: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

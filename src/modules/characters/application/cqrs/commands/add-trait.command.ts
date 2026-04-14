import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class AddTraitCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly traitId: string,
    public readonly tier: number | undefined,
    public readonly specialization: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class AddSkillCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string | null,
    public readonly ranks: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

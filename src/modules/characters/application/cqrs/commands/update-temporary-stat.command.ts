import { StatKey } from 'src/modules/characters/domain/value-objects/character-stat.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class UpdateTemporaryStatCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly stat: StatKey,
    public readonly value: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

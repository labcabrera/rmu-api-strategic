import { ItemInfo } from '../../../domain/value-objects/item-info.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class CreateItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly factionId: string | null,
    public readonly characterId: string | null,
    public readonly itemTypeId: string,
    public readonly name: string | null,
    public readonly carried: boolean | null,
    public readonly info: ItemInfo | null,
    public readonly amount: number | null,
    public readonly description: string | null,
    public readonly cost: number | null,
    public readonly wielderSize: string | null,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

import { ItemAffix } from 'src/modules/items/domain/value-objects/item-affix.vo';
import { ItemInfo } from 'src/modules/items/domain/value-objects/item-info.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

export class CreateItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly factionId: string | null,
    public readonly characterId: string | null,
    public readonly itemTypeId: string,
    public readonly name: string | null,
    public readonly carried: boolean | null,
    public readonly affixes: ItemAffix[] | null,
    public readonly info: ItemInfo | null,
    public readonly amount: number | null,
    public readonly description: string | null,
    public readonly cost: number | null,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

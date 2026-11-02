import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemModifierTarget, ItemModifierType } from '../../../domain/value-objects/item-modifier.vo.js';

/** `POST /v1/items/:id/modifiers` (spec 019, decision 13): a modifier set by hand. */
export class AddItemModifierCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly type: ItemModifierType,
    public readonly value: number,
    public readonly appliesTo: ItemModifierTarget,
    public readonly broken: boolean | undefined,
    public readonly description: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

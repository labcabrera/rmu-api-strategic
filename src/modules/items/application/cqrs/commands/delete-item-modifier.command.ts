import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

/** `DELETE /v1/items/:id/modifiers/:modifierId`: a repair by hand, or a modifier no longer wanted. */
export class DeleteItemModifierCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly modifierId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

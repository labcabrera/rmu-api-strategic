import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { ItemManeuverRequest } from './item-maneuver.js';

/** Repairs a damaged or broken item (§6.2, workspace spec 023, decision 11). */
export class RepairItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemId: string,
    public readonly maneuver: ItemManeuverRequest,
    public readonly options: { cost?: number; payer?: ItemHolder },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

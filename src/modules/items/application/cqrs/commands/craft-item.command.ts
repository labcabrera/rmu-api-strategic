import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { CraftingEnhancement } from '../../../domain/services/crafting-outcome.js';
import type { CraftingQuality } from '../../../domain/services/crafting-plan.js';
import type { ItemManeuverRequest } from './item-maneuver.js';

/** A craftsman makes an item of a catalog type (workspace spec 023, decision 10). */
export class CraftItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly itemTypeId: string,
    public readonly maneuver: ItemManeuverRequest & { actorId: string },
    public readonly options: {
      /** Who gets the item: by default the craftsman. */
      to?: ItemHolder;
      /** Who pays the materials: by default who gets the item; null when nobody pays. */
      payer?: ItemHolder | null;
      amount?: number;
      /** Materials of all the units; by default a percent of the average cost. */
      materialsCost?: number;
      enhancements?: CraftingEnhancement[];
      /** Extra cost of the enhancements, typed by the game master (Core Law does not fix it). */
      enhancementsCost?: number;
      name?: string | null;
      description?: string | null;
      wielderSize?: string | null;
      /** Workspace spec 043: material, masterwork, armor weight and workshop. */
      quality?: CraftingQuality | null;
    },
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

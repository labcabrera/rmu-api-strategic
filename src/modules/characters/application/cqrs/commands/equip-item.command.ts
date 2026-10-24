import type { EquipmentSlot } from '../../../domain/value-objects/character-equipment.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

export class EquipItemCommand extends AuthenticatedCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    public readonly slot: EquipmentSlot,
    userId: string,
    userRoles: string[],
  ) {
    super(userId, userRoles);
  }
}

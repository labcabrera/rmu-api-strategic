import { EquipmentSlot } from 'src/modules/characters/domain/value-objects/character-equipment.vo';
import { AuthenticatedCommand } from 'src/modules/shared/application/cqrs/authenticated-command';

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

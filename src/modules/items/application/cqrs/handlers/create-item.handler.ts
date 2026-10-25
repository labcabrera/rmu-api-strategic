import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CreateItemCommand } from '../commands/create-item.command.js';
import { PurchaseItemCommand } from '../commands/purchase-item.command.js';
import { Item } from '../../../domain/aggregates/item.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { ItemOperationResult } from '../../services/item-stock.service.js';

/**
 * `POST /v1/items`, the purchase of before workspace spec 023: kept as an alias of the purchase until the clients
 * move to `POST /v1/items/purchases` (decision 8). A character pays with its coins and then its faction.
 */
@CommandHandler(CreateItemCommand)
export class CreateItemHandler implements ICommandHandler<CreateItemCommand, Item> {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateItemCommand): Promise<Item> {
    if (command.factionId && command.characterId) {
      throw new ValidationError('Cannot specify both factionId and characterId', 'err-item-holder-required');
    }
    if (!command.factionId && !command.characterId) {
      throw new ValidationError('Either factionId or characterId must be specified', 'err-item-holder-required');
    }
    const buyer: ItemHolder = command.characterId
      ? { kind: 'character', id: command.characterId }
      : { kind: 'faction', id: command.factionId! };
    const purchase = new PurchaseItemCommand(
      buyer,
      command.itemTypeId,
      {
        gameId: command.gameId,
        amount: command.amount ?? undefined,
        unitPrice: command.cost || undefined,
        payer: 'split',
        name: command.name,
        description: command.description,
        wielderSize: command.wielderSize,
        carried: command.carried ?? undefined,
      },
      command.userId,
      command.roles,
    );
    const result = await this.commandBus.execute<PurchaseItemCommand, ItemOperationResult>(purchase);
    return result.item!;
  }
}

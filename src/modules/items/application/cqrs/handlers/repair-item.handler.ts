import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ItemRepair } from '../../../domain/services/item-repair.js';
import { roundGold } from '../../../domain/services/price-calculator.js';
import { RepairItemCommand } from '../commands/repair-item.command.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { ItemManeuverService } from '../../services/item-maneuver.service.js';
import { type ItemOperationResult, ItemStock } from '../../services/item-stock.service.js';
import { Wallet } from '../../services/wallet.service.js';

export const REPAIR_TABLE = 'repair';

/**
 * Repair of a damaged or broken item (§6.2, workspace spec 023, decision 11): an absolute maneuver with the damage
 * of the item as a penalty (-100 if broken), resolved on the `repair` table of core, whose result changes the
 * breakage modifiers. The repairer is a character of the game, or a craftsman with a typed bonus.
 */
@CommandHandler(RepairItemCommand)
export class RepairItemHandler implements ICommandHandler<RepairItemCommand, ItemOperationResult> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly wallet: Wallet,
    private readonly maneuvers: ItemManeuverService,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: RepairItemCommand): Promise<ItemOperationResult> {
    const { options, userId, roles } = command;
    const item = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(item.holder);
    await this.holderAccess.checkManage(holder, userId, roles);
    const condition = item.getCondition();
    if (condition.unrepairable) throw new ValidationError('The item can no longer be repaired', 'err-item-unrepairable');
    if (!condition.broken && condition.breakagePenalty >= 0) throw new ValidationError('The item is not damaged', 'err-item-not-damaged');

    const repairer = command.maneuver.actorId ? await this.holderAccess.load({ kind: 'character', id: command.maneuver.actorId }) : null;
    if (repairer) this.holderAccess.checkSameGame(holder, repairer);
    const cost = roundGold(options.cost ?? 0);
    if (cost < 0) throw new ValidationError('The cost cannot be negative', 'err-item-invalid-price');
    const payer = cost > 0 ? (options.payer ? await this.holderAccess.load(options.payer) : holder) : null;
    if (payer) {
      this.holderAccess.checkSameGame(holder, payer);
      await this.holderAccess.checkManage(payer, userId, roles);
    }

    const { response, maneuver } = await this.maneuvers.resolve(REPAIR_TABLE, command.maneuver, repairer, [
      { key: 'item-damage', value: ItemRepair.rollPenalty(condition) },
    ]);
    const payments = payer ? await this.wallet.charge([{ context: payer, gold: cost }]) : [];

    const entryId = randomUUID();
    const result = ItemRepair.apply(item.modifiers, response.result, !!maneuver.unusualEvent, entryId);
    let updated;
    try {
      item.replaceBreakage(result.breakage, result.unrepairable);
      updated = await this.itemRepository.update(item);
      await this.events.publishChanges('item', item);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }

    const entry = await this.ledger.record({
      id: entryId,
      gameId: holder.gameId,
      kind: 'repair',
      itemId: item.id,
      itemTypeId: item.itemTypeId,
      itemName: item.name,
      amount: item.units,
      from: holder.holder,
      to: holder.holder,
      payments,
      maneuver,
      actorId: repairer?.holder.id ?? null,
      outcome: result.outcome,
      note: response.unusualEvent ?? null,
      userId,
    });
    await this.inventorySync.refresh(holder.holder, payer?.holder);
    return { item: updated, entry };
  }
}

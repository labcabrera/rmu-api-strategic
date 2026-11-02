import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { HolderAccess } from '../../../../items/application/services/holder-access.service.js';
import { InventorySync } from '../../../../items/application/services/inventory-sync.service.js';
import { Wallet } from '../../../../items/application/services/wallet.service.js';
import type { LedgerPayment } from '../../../../items/domain/aggregates/item-ledger-entry.js';
import type { EnchantmentProject } from '../../../domain/aggregates/enchantment-project.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../../ports/enchantment-repository.port.js';
import { EnchantmentAccess } from '../../services/enchantment-access.service.js';
import { EnchantmentLedger } from '../../services/enchantment-ledger.service.js';
import { CancelEnchantmentCommand } from '../commands/enchantment.commands.js';

/**
 * Cancels an active project (workspace spec 064): the payer gets back the share of what it paid for the days not
 * worked (`enchant-refund`).
 */
@CommandHandler(CancelEnchantmentCommand)
export class CancelEnchantmentHandler implements ICommandHandler<CancelEnchantmentCommand, EnchantmentProject> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
    private readonly holderAccess: HolderAccess,
    private readonly wallet: Wallet,
    private readonly ledger: EnchantmentLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: CancelEnchantmentCommand): Promise<EnchantmentProject> {
    const { userId, roles } = command;
    const { project } = await this.access.findManaged(command.projectId, userId, roles);
    project.checkCancellable();
    const refund = project.payer ? project.refundAmount() : 0;
    const payer = refund > 0 ? await this.holderAccess.load(project.payer!) : null;
    const payments: LedgerPayment[] = payer ? [await this.wallet.credit(payer, refund)] : [];
    const entryId = payer ? randomUUID() : null;
    project.cancel(payer ? refund : 0, entryId);
    let updated: EnchantmentProject;
    try {
      updated = await this.repository.update(project);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    if (payer && entryId) {
      await this.ledger.record(entryId, updated, 'enchant-refund', 'enchantment-cancelled', payments, null, userId);
      await this.inventorySync.refresh(payer.holder);
    }
    return updated;
  }
}

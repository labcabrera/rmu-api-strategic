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
import { UpdateEnchantmentCommand } from '../commands/enchantment.commands.js';

/**
 * Adjusts a project for the failure results (workspace spec 064): extra days, extra cost and notes. `extraCost` is the
 * new total: the payer gives the difference (an `enchant` entry), or gets it back when it is lower (`enchant-refund`).
 */
@CommandHandler(UpdateEnchantmentCommand)
export class UpdateEnchantmentHandler implements ICommandHandler<UpdateEnchantmentCommand, EnchantmentProject> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly access: EnchantmentAccess,
    private readonly holderAccess: HolderAccess,
    private readonly wallet: Wallet,
    private readonly ledger: EnchantmentLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: UpdateEnchantmentCommand): Promise<EnchantmentProject> {
    const { userId, roles } = command;
    const { project } = await this.access.findManaged(command.projectId, userId, roles);
    project.checkVersion(command.changes.version);
    const delta = project.adjust(command.changes);

    const payer = delta !== 0 && project.payer ? await this.holderAccess.load(project.payer) : null;
    let payments: LedgerPayment[] = [];
    const entryId = randomUUID();
    if (payer) {
      await this.holderAccess.checkManage(payer, userId, roles);
      payments = delta > 0 ? await this.wallet.charge([{ context: payer, gold: delta }]) : [await this.wallet.credit(payer, -delta)];
      project.recordPayment(delta, entryId);
    }
    let updated: EnchantmentProject;
    try {
      updated = await this.repository.update(project);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    if (payer) {
      await this.ledger.record(
        entryId,
        updated,
        delta > 0 ? 'enchant' : 'enchant-refund',
        'enchantment-extra-cost',
        payments,
        null,
        userId,
      );
      await this.inventorySync.refresh(payer.holder);
    }
    return updated;
  }
}

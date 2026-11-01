import { Injectable } from '@nestjs/common';
import type { LedgerPayment } from '../../../items/domain/aggregates/item-ledger-entry.js';
import { ItemLedger } from '../../../items/application/services/item-ledger.service.js';
import type { ItemHolder } from '../../../items/domain/value-objects/item-holder.vo.js';
import type { EnchantmentProject } from '../../domain/aggregates/enchantment-project.js';

/** Outcome keys of the ledger entries of an enchantment (translated by the clients). */
export type EnchantmentLedgerOutcome = 'enchantment-started' | 'enchantment-extra-cost' | 'enchantment-cancelled';

/** The ledger entries of an enchantment project (workspace spec 064): `enchant` and `enchant-refund`. */
@Injectable()
export class EnchantmentLedger {
  constructor(private readonly ledger: ItemLedger) {}

  async record(
    id: string,
    project: EnchantmentProject,
    kind: 'enchant' | 'enchant-refund',
    outcome: EnchantmentLedgerOutcome,
    payments: LedgerPayment[],
    itemHolder: ItemHolder | null,
    userId: string,
  ): Promise<void> {
    const props = project.getProps();
    await this.ledger.record({
      id,
      gameId: props.gameId,
      kind,
      itemId: props.itemId,
      itemTypeId: null,
      itemName: props.itemName,
      amount: props.plan.batchSize,
      from: null,
      to: itemHolder,
      payments,
      actorId: props.alchemistId,
      outcome,
      details: {
        enchantment: {
          projectId: props.id,
          itemLevel: props.plan.itemLevel,
          workingDays: props.plan.workingDays,
          extraDays: props.extraDays,
          daysCompleted: props.daysCompleted,
          powerLevel: props.plan.powerLevel,
        },
      },
      userId,
    });
  }
}

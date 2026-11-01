import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { type HolderContext, HolderAccess } from '../../../../items/application/services/holder-access.service.js';
import { InventorySync } from '../../../../items/application/services/inventory-sync.service.js';
import { Wallet } from '../../../../items/application/services/wallet.service.js';
import { EnchantmentProject, EnchantmentScrRules } from '../../../domain/aggregates/enchantment-project.js';
import { round2 } from '../../../domain/services/enchantment-planner.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../../ports/enchantment-repository.port.js';
import { EnchantmentLedger } from '../../services/enchantment-ledger.service.js';
import { EnchantmentPlanning } from '../../services/enchantment-planning.service.js';
import { CreateEnchantmentCommand } from '../commands/enchantment.commands.js';

/**
 * Starts an enchantment (workspace spec 064, decision 6): one SCR per spell for the whole process, made now; the
 * materials are paid in advance by the payer (an `enchant` entry of the ledger). A failed SCR leaves the project
 * waiting for its failure roll.
 */
@CommandHandler(CreateEnchantmentCommand)
export class CreateEnchantmentHandler implements ICommandHandler<CreateEnchantmentCommand, EnchantmentProject> {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    private readonly planning: EnchantmentPlanning,
    private readonly holderAccess: HolderAccess,
    private readonly wallet: Wallet,
    private readonly ledger: EnchantmentLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: CreateEnchantmentCommand): Promise<EnchantmentProject> {
    const { userId, roles } = command;
    const { alchemist, item, itemHolder, plan } = await this.planning.prepare(command.request, userId, roles);
    // The rolls are checked before any gold moves
    EnchantmentScrRules.resolve(plan, command.scrRolls);

    let payer: HolderContext | null = itemHolder;
    if (command.payer === null) payer = null;
    else if (command.payer) payer = await this.holderAccess.load(command.payer);
    if (payer) {
      this.holderAccess.checkSameGame(alchemist, payer);
      await this.holderAccess.checkManage(payer, userId, roles);
    }

    const payments = payer && plan.paidAtStart > 0 ? await this.wallet.charge([{ context: payer, gold: plan.paidAtStart }]) : [];
    const entryId = randomUUID();
    let project: EnchantmentProject;
    try {
      project = EnchantmentProject.start({
        gameId: alchemist.gameId,
        alchemistId: alchemist.holder.id,
        alchemistName: alchemist.character.name,
        itemId: item.id,
        itemName: item.name,
        request: {
          alchemistId: command.request.alchemistId,
          itemId: command.request.itemId,
          spells: command.request.spells.map(spell => ({
            spellId: spell.spellId,
            scope: spell.scope ?? 'normal',
            target: spell.target ?? null,
          })),
          batchSize: plan.batchSize,
          powerLevel: plan.powerLevel,
        },
        plan,
        scrRolls: command.scrRolls,
        payer: payer?.holder ?? null,
        paid: round2(-payments.reduce((total, payment) => total + payment.gold, 0)),
        ledgerEntryIds: [entryId],
        owner: userId,
      });
      project = await this.repository.save(project);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    await this.ledger.record(entryId, project, 'enchant', 'enchantment-started', payments, itemHolder.holder, userId);
    await this.inventorySync.refresh(payer?.holder);
    return project;
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ItemGuardPort, ITEM_GUARD } from '../../ports/item-guard.port.js';
import { randomUUID } from 'crypto';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { CraftingOutcomes } from '../../../domain/services/crafting-outcome.js';
import { PriceCalculator, roundGold } from '../../../domain/services/price-calculator.js';
import { ITEM_MODIFIER_TARGETS } from '../../../domain/value-objects/item-modifier.vo.js';
import { CraftItemCommand } from '../commands/craft-item.command.js';
import { EconomyRulesProvider } from '../../services/economy-rules.provider.js';
import { type HolderContext, HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { ItemManeuverService } from '../../services/item-maneuver.service.js';
import type { ItemOperationResult } from '../../services/item-stock.service.js';
import { Wallet } from '../../services/wallet.service.js';

export const CRAFTING_TABLE = 'crafting';

/**
 * A craftsman of the game makes an item (workspace spec 023, decision 10): the materials are paid first and are lost
 * on a failure (table 3-9); a success makes the item with the enhancements of the game master and the Strength change
 * of the result. The production hours of the type are information only (there is no game time).
 */
@CommandHandler(CraftItemCommand)
export class CraftItemHandler implements ICommandHandler<CraftItemCommand, ItemOperationResult> {
  constructor(
    @Inject(ITEM_GUARD) private readonly itemGuard: ItemGuardPort,
    private readonly holderAccess: HolderAccess,
    private readonly itemFactory: ItemFactory,
    private readonly wallet: Wallet,
    private readonly maneuvers: ItemManeuverService,
    private readonly rules: EconomyRulesProvider,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: CraftItemCommand): Promise<ItemOperationResult> {
    const { options, userId, roles } = command;
    // New items: rmu-user or rmu-admin
    this.itemGuard.checkCreate(roles);
    const crafter = await this.holderAccess.load({ kind: 'character', id: command.maneuver.actorId });
    await this.holderAccess.checkManage(crafter, userId, roles);
    const to = options.to ? await this.holderAccess.load(options.to) : crafter;
    this.holderAccess.checkSameGame(crafter, to);
    await this.holderAccess.checkManage(to, userId, roles);
    let payer: HolderContext | null = to;
    if (options.payer === null) payer = null;
    else if (options.payer) payer = await this.holderAccess.load(options.payer);
    if (payer) {
      this.holderAccess.checkSameGame(crafter, payer);
      await this.holderAccess.checkManage(payer, userId, roles);
    }

    const enhancements = options.enhancements ?? [];
    enhancements.forEach(enhancement => {
      if (!ITEM_MODIFIER_TARGETS.includes(enhancement.appliesTo) || !Number.isFinite(enhancement.value)) {
        throw new ValidationError('Invalid enhancement', 'err-item-modifier-invalid');
      }
    });
    const enhancementsCost = options.enhancementsCost ?? 0;
    if (enhancementsCost < 0) throw new ValidationError('The cost cannot be negative', 'err-item-invalid-price');

    const itemType = await this.itemFactory.itemType(command.itemTypeId);
    const amount = options.amount ?? 1;
    PriceCalculator.checkAmount(amount);
    const average = itemType.info.cost?.average ?? 0;
    const cost = roundGold(PriceCalculator.materials(average * amount, this.rules.rules(), options.materialsCost) + enhancementsCost);

    const { response, maneuver } = await this.maneuvers.resolve(CRAFTING_TABLE, command.maneuver, crafter);
    const payments = payer && cost > 0 ? await this.wallet.charge([{ context: payer, gold: cost }]) : [];

    const entryId = randomUUID();
    const outcome = CraftingOutcomes.resolve(response.result, response.effects, enhancements, entryId);
    let item = null;
    if (outcome.crafted) {
      try {
        const built = this.itemFactory.build(itemType, {
          gameId: to.gameId,
          holder: to.holder,
          character: to.character,
          amount,
          name: options.name,
          description: options.description,
          wielderSize: options.wielderSize,
          modifiers: outcome.modifiers,
          value: roundGold(average + enhancementsCost / amount),
          acquiredPrice: roundGold(cost / amount),
          owner: userId,
        });
        item = (await this.itemFactory.store(built)).item;
      } catch (e) {
        await this.wallet.revert(payments);
        throw e;
      }
    }

    const entry = await this.ledger.record({
      id: entryId,
      gameId: to.gameId,
      kind: 'craft',
      itemId: item?.id ?? null,
      itemTypeId: itemType.id,
      itemName: item?.name ?? options.name ?? itemType.name ?? itemType.id,
      amount,
      from: null,
      to: to.holder,
      payments,
      maneuver,
      actorId: crafter.holder.id,
      outcome: outcome.crafted ? 'crafted' : 'wasted',
      note: response.unusualEvent ?? null,
      userId,
    });
    await this.inventorySync.refresh(to.holder, payer?.holder);
    return { item, entry };
  }
}

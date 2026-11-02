import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Item } from '../../../domain/aggregates/item.js';
import { roundGold } from '../../../domain/services/price-calculator.js';
import { GEM_CATEGORY } from '../../../domain/services/item-unit-value.js';
import type { ItemGemMagic, ItemGemSetting } from '../../../domain/value-objects/item-enchantment.vo.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../ports/item-repository.port.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemFactory } from '../../services/item-factory.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { ItemStock } from '../../services/item-stock.service.js';
import { Wallet } from '../../services/wallet.service.js';
import { CutGemCommand, SetGemCommand, UnsetGemCommand } from '../commands/magic-item.commands.js';

/** Factors of the modern cut (Treasure Law 2.4, optional rule). */
export const GEM_CUT_FACTORS = [5, 10] as const;

/** Part of the new value of a gem a lapidary charges for its cut (workspace spec 067, decision 18). */
export const GEM_CUT_FEE = 0.1;

/**
 * The modern cut of a gem without one (workspace spec 067, decision 18): no roll, the value times 5 or 10, and the
 * holder pays a lapidary 10 % of the new value. Ledger `gem-cut`.
 */
@CommandHandler(CutGemCommand)
export class CutGemHandler implements ICommandHandler<CutGemCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
  ) {}

  async execute(command: CutGemCommand): Promise<Item> {
    if (!(GEM_CUT_FACTORS as readonly number[]).includes(command.cutFactor)) {
      throw new ValidationError('The cut factor is 5 or 10', 'err-item-invalid-gem');
    }
    const gem = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(gem.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    gem.cut(command.cutFactor);
    const fee = roundGold(gem.unitValue * gem.units * GEM_CUT_FEE);
    const payments = await this.wallet.charge([{ context: holder, gold: fee }]);
    let updated: Item;
    try {
      updated = await this.itemRepository.update(gem);
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    await this.events.publishChanges('item', gem);
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'gem-cut',
      itemId: gem.id,
      itemTypeId: gem.itemTypeId,
      itemName: gem.name,
      amount: gem.units,
      from: null,
      to: holder.holder,
      payments,
      details: { cutFactor: command.cutFactor, value: gem.unitValue },
      userId: command.userId,
    });
    return updated;
  }
}

/**
 * A gem of the same holder set in an item (workspace spec 067, decision 19): the item keeps a copy of the gem with its
 * magic traits and adds its value; the gem item is gone. Ledger `gem-set`.
 */
@CommandHandler(SetGemCommand)
export class SetGemHandler implements ICommandHandler<SetGemCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: SetGemCommand): Promise<Item> {
    const host = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(host.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    if (command.gemItemId === host.id) throw new ValidationError('A gem cannot be set in itself', 'err-item-setting-invalid');
    const gem = await this.stock.load(command.gemItemId);
    if (!gem.isHeldBy(host.holder)) {
      throw new ValidationError('The gem must be held by the holder of the item', 'err-item-not-same-holder');
    }
    if (gem.category !== GEM_CATEGORY) throw new ValidationError('Only a gem can be set', 'err-item-not-gem');
    if (gem.units !== 1) throw new ValidationError('Only one gem is set at a time: split the stack first', 'err-item-invalid-amount');

    host.setGem(SetGemHandler.settingOf(gem, new Date()));
    const taken = await this.stock.take(gem, 1);
    let updated: Item;
    try {
      updated = await this.itemRepository.update(host);
    } catch (e) {
      await this.stock.restore(taken);
      throw e;
    }
    await this.events.publishChanges('item', host);
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'gem-set',
      itemId: host.id,
      itemIds: [host.id, gem.id],
      itemTypeId: gem.itemTypeId,
      itemName: gem.name,
      amount: 1,
      from: holder.holder,
      to: holder.holder,
      note: `setting:${host.id}`,
      userId: command.userId,
    });
    await this.inventorySync.refresh(holder.holder);
    return updated;
  }

  /** The copy the item keeps: the gem data and the magic traits of its catalog type. */
  static settingOf(gem: Item, now: Date): ItemGemSetting {
    const magic = gem.catalog?.features?.gem?.magic;
    const traits: ItemGemMagic | null = magic
      ? { spells: magic.spells ?? null, stats: [...(magic.stats ?? [])], skills: magic.skills ?? null, other: magic.other ?? null }
      : null;
    return {
      itemTypeId: gem.itemTypeId,
      name: gem.name,
      carats: gem.carats,
      cutFactor: gem.cutFactor,
      value: roundGold(gem.unitValue),
      magic: traits,
      setAt: now.toISOString(),
    };
  }
}

/** A gem taken out of an item goes back to the holder of the item, as it was when it was set. Ledger `gem-unset`. */
@CommandHandler(UnsetGemCommand)
export class UnsetGemHandler implements ICommandHandler<UnsetGemCommand, Item> {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly holderAccess: HolderAccess,
    private readonly stock: ItemStock,
    private readonly itemFactory: ItemFactory,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: UnsetGemCommand): Promise<Item> {
    const host = await this.stock.load(command.itemId);
    const holder = await this.holderAccess.load(host.holder);
    await this.holderAccess.checkManage(holder, command.userId, command.roles);
    const setting = host.unsetGem(command.index);
    const gemType = await this.itemFactory.itemType(setting.itemTypeId);
    const gem = this.itemFactory.build(gemType, {
      gameId: holder.gameId,
      holder: holder.holder,
      character: holder.character,
      name: setting.name,
      value: setting.value,
      instance: {
        ...(setting.carats !== null ? { carats: setting.carats } : {}),
        ...(setting.cutFactor !== null ? { cutFactor: setting.cutFactor } : {}),
      },
      owner: host.owner,
    });
    const stored = await this.itemFactory.store(gem);
    let updated: Item;
    try {
      updated = await this.itemRepository.update(host);
    } catch (e) {
      await this.itemFactory.unstore(stored, 1);
      throw e;
    }
    await this.events.publishChanges('item', host);
    await this.ledger.record({
      gameId: holder.gameId,
      kind: 'gem-unset',
      itemId: host.id,
      itemIds: [host.id, stored.item.id],
      itemTypeId: setting.itemTypeId,
      itemName: setting.name,
      amount: 1,
      from: holder.holder,
      to: holder.holder,
      note: `setting:${host.id}`,
      userId: command.userId,
    });
    await this.inventorySync.refresh(holder.holder);
    return updated;
  }
}

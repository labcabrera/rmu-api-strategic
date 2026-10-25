import { Inject, Injectable } from '@nestjs/common';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../factions/application/ports/faction-repository.port.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { GOLD_COIN } from '../../domain/aggregates/item.js';
import type { LedgerPayment } from '../../domain/aggregates/item-ledger-entry.js';
import { roundGold } from '../../domain/services/price-calculator.js';
import type { ItemHolder } from '../../domain/value-objects/item-holder.vo.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../ports/item-repository.port.js';
import { ItemFactory } from './item-factory.service.js';
import type { HolderContext } from './holder-access.service.js';

/** Who pays a purchase of a character: the character, its faction, or the coins of the character and then the faction. */
export type PayerMode = 'holder' | 'faction' | 'split';
export const PAYER_MODES: PayerMode[] = ['holder', 'faction', 'split'];

/** Gold to take from a holder (positive). */
export interface Charge {
  context: HolderContext;
  gold: number;
}

/**
 * Gold of the holders (workspace spec 023, decision 7): the `availableGold` of a faction, and the `gold-coin` stack of
 * a character (coins weigh). Each write is conditional on the version that was read, so two concurrent operations
 * cannot both spend the same gold; an operation of several steps undoes the ones it made when a later one fails.
 */
@Injectable()
export class Wallet {
  constructor(
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly itemFactory: ItemFactory,
  ) {}

  async balance(holder: ItemHolder): Promise<number> {
    if (holder.kind === 'faction') {
      const faction = await this.factionRepository.findById(holder.id);
      return faction?.management.availableGold ?? 0;
    }
    const coins = await this.itemRepository.findStack(holder, GOLD_COIN);
    return coins?.amount ?? 0;
  }

  /** Who pays `total` for a buyer: one or two charges, with the gold each one has checked. */
  async plan(buyer: HolderContext, mode: PayerMode, total: number, faction: HolderContext): Promise<Charge[]> {
    total = roundGold(total);
    if (total <= 0) return [];
    if (mode === 'faction' || buyer.holder.kind === 'faction') return [{ context: buyer.character ? faction : buyer, gold: total }];
    if (mode === 'holder') return [{ context: buyer, gold: total }];
    const coins = await this.balance(buyer.holder);
    const own = roundGold(Math.min(total, coins));
    return [
      { context: buyer, gold: own },
      { context: faction, gold: roundGold(total - own) },
    ].filter(charge => charge.gold > 0);
  }

  /** Takes the gold of every charge, or none: on a failure the charges already taken are given back. */
  async charge(charges: Charge[]): Promise<LedgerPayment[]> {
    const done: LedgerPayment[] = [];
    try {
      for (const charge of charges) {
        await this.move(charge.context.holder, -charge.gold, charge.context);
        done.push({ holder: charge.context.holder, gold: -charge.gold });
      }
    } catch (e) {
      await this.revert(done);
      throw e;
    }
    return done;
  }

  async credit(context: HolderContext, gold: number): Promise<LedgerPayment> {
    await this.move(context.holder, gold, context);
    return { holder: context.holder, gold };
  }

  /** Undoes payments (best effort, in reverse order). */
  async revert(payments: LedgerPayment[]): Promise<void> {
    for (const payment of [...payments].reverse()) {
      await this.move(payment.holder, -payment.gold, null);
    }
  }

  private async move(holder: ItemHolder, gold: number, context: HolderContext | null): Promise<void> {
    gold = roundGold(gold);
    if (gold === 0) return;
    if (holder.kind === 'faction') {
      const faction = await this.factionRepository.findById(holder.id);
      if (!faction) throw new NotFoundError('Faction', holder.id, 'err-faction-not-found');
      if (faction.management.availableGold + gold < 0) {
        throw new ValidationError(`The faction has ${faction.management.availableGold} gold, ${-gold} are needed`, 'err-insufficient-gold');
      }
      faction.addGold(gold);
      await this.factionRepository.update(faction);
      await this.events.publishChanges('faction', faction);
      return;
    }
    const coins = await this.itemRepository.findStack(holder, GOLD_COIN);
    if (gold < 0 && (coins?.amount ?? 0) + gold < 0) {
      throw new ValidationError(`The character has ${coins?.amount ?? 0} gold, ${-gold} are needed`, 'err-insufficient-gold');
    }
    if (coins) {
      coins.addAmount(gold);
      await this.itemRepository.update(coins);
      await this.events.publishChanges('item', coins);
      return;
    }
    // The first coins of a character: a stack of the catalog type, carried in the purse
    const itemType = await this.itemFactory.itemType(GOLD_COIN);
    const character = context?.character ?? null;
    const item = this.itemFactory.build(itemType, {
      gameId: context?.gameId ?? '',
      holder,
      character,
      amount: gold,
      carried: true,
      owner: character?.owner ?? holder.id,
    });
    if (!item.gameId) throw new ValidationError('The game of the character is unknown', 'err-item-invalid');
    await this.itemRepository.save(item);
    await this.events.publishChanges('item', item);
  }
}

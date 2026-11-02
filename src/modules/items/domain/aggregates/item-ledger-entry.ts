import { randomUUID } from 'crypto';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import type { ItemHolder } from '../value-objects/item-holder.vo.js';
import type { PriceBreakdown } from '../services/price-calculator.js';

/** Operations of the item ledger (workspace spec 023, decision 6). */
/** Spec 024 adds `import`: an item or gold that came from an export file. */
/** Workspace spec 062 adds `found`: doses of a herb search, for free. */
/** Workspace spec 064 adds `enchant` (materials and extra costs of an enchantment) and `enchant-refund` (its cancel). */
/**
 * Workspace spec 067 adds `treasure` (an award of a random treasure), `magic-item` (a magic item made by the game
 * master), `recharge` (of a charged item), `gem-cut`, `gem-set` and `gem-unset`.
 */
/** Workspace spec 068 adds `consumed`: units of an item spent in a tactical game (herbs, potions). */
export type ItemLedgerKind =
  | 'purchase'
  | 'sale'
  | 'transfer'
  | 'craft'
  | 'repair'
  | 'discard'
  | 'gold-transfer'
  | 'import'
  | 'found'
  | 'enchant'
  | 'enchant-refund'
  | 'treasure'
  | 'magic-item'
  | 'recharge'
  | 'gem-cut'
  | 'gem-set'
  | 'gem-unset'
  | 'consumed';
export const ITEM_LEDGER_KINDS: ItemLedgerKind[] = [
  'purchase',
  'sale',
  'transfer',
  'craft',
  'repair',
  'discard',
  'gold-transfer',
  'import',
  'found',
  'enchant',
  'enchant-refund',
  'treasure',
  'magic-item',
  'recharge',
  'gem-cut',
  'gem-set',
  'gem-unset',
  'consumed',
];

/** Gold that moved in an operation: negative when the holder paid it, positive when it received it. */
export interface LedgerPayment {
  holder: ItemHolder;
  gold: number;
}

/** A maneuver of an operation: the roll, its bonuses and the result of core. */
export interface LedgerManeuver {
  skillId?: string;
  roll: number;
  unmodifiedRoll?: number;
  bonus: number;
  modifiers: { key: string; value: number }[];
  total: number;
  result?: string;
  percent?: number;
  unusualEvent?: boolean;
}

export interface ItemLedgerEntryProps {
  id: string;
  gameId: string;
  kind: ItemLedgerKind;
  itemId: string | null;
  /** Workspace spec 041: every item of the operation (a purchase of N items that do not stack has N), for the history of each item. */
  itemIds: string[];
  itemTypeId: string | null;
  itemName: string | null;
  amount: number | null;
  from: ItemHolder | null;
  to: ItemHolder | null;
  /** Every holder the entry concerns (from, to, payers), for the listings by character or faction. */
  holderIds: string[];
  payments: LedgerPayment[];
  price: PriceBreakdown | null;
  maneuver: LedgerManeuver | null;
  /** Character who crafted or repaired. */
  actorId: string | null;
  /** Outcome key of a craft or repair (translated by the clients). */
  outcome: string | null;
  note: string | null;
  /** Spec 024: data of the operation, like the file of an import (format and app versions, source game, file name). */
  details?: Record<string, unknown> | null;
  userId: string;
  createdAt: Date;
}

export type NewItemLedgerEntry = Omit<
  ItemLedgerEntryProps,
  'id' | 'itemIds' | 'holderIds' | 'createdAt' | 'payments' | 'price' | 'maneuver' | 'actorId' | 'outcome' | 'note' | 'details'
> &
  Partial<Pick<ItemLedgerEntryProps, 'id' | 'itemIds' | 'payments' | 'price' | 'maneuver' | 'actorId' | 'outcome' | 'note' | 'details'>>;

/** One operation on items or gold: append only, never changed after it is stored. */
export class ItemLedgerEntry extends BaseAggregateRoot<ItemLedgerEntryProps> {
  private constructor(private readonly props: ItemLedgerEntryProps) {
    super(props.id);
  }

  static create(props: NewItemLedgerEntry): ItemLedgerEntry {
    const payments = props.payments ?? [];
    const holderIds = [
      ...new Set([props.from?.id, props.to?.id, ...payments.map(payment => payment.holder.id)].filter((id): id is string => !!id)),
    ];
    return new ItemLedgerEntry({
      ...props,
      id: props.id ?? randomUUID(),
      itemIds: props.itemIds?.length ? [...new Set(props.itemIds)] : props.itemId ? [props.itemId] : [],
      payments,
      price: props.price ?? null,
      maneuver: props.maneuver ?? null,
      actorId: props.actorId ?? null,
      outcome: props.outcome ?? null,
      note: props.note ?? null,
      holderIds,
      createdAt: new Date(),
    });
  }

  static fromProps(props: ItemLedgerEntryProps): ItemLedgerEntry {
    return new ItemLedgerEntry(props);
  }

  getProps(): ItemLedgerEntryProps {
    return this.props;
  }
}

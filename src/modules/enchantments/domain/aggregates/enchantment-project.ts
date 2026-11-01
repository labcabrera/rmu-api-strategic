import { randomUUID } from 'crypto';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import { ConflictError, ValidationError } from '../../../shared/domain/errors/errors.js';
import type { ItemHolder } from '../../../items/domain/value-objects/item-holder.vo.js';
import type { AlchemyFailureRow, AlchemyFailureTable, PowerLevel } from '../value-objects/alchemy.vo.js';
import { type EnchantmentPlan, type EnchantmentScope, round2 } from '../services/enchantment-planner.js';

export const ENCHANTMENT_STATUSES = ['pending-failures', 'in-progress', 'suspended', 'completed', 'cancelled'] as const;
export type EnchantmentStatus = (typeof ENCHANTMENT_STATUSES)[number];
/** The statuses of a project that still holds its item. */
export const ACTIVE_ENCHANTMENT_STATUSES: EnchantmentStatus[] = ['pending-failures', 'in-progress', 'suspended'];

export interface EnchantmentRequestSpell {
  spellId: string;
  scope?: EnchantmentScope;
  target?: string | null;
}

/** What is asked: the alchemist, the item, the spells, the batch and the power level of the campaign. */
export interface EnchantmentRequest {
  alchemistId: string;
  itemId: string;
  spells: EnchantmentRequestSpell[];
  batchSize?: number;
  powerLevel?: PowerLevel;
}

/** The failure row a failure roll fell in, copied from the tables of core. */
export interface EnchantmentFailure {
  table: AlchemyFailureTable;
  min: number;
  max: number | null;
  text: string;
  serendipity?: 'minor' | 'major';
}

/** The Spellcasting Roll of a spell, made once when the work starts (Treasure Law 5.2). */
export interface EnchantmentScr {
  spellId: string;
  roll: number;
  total: number;
  failed: boolean;
  failureRoll: number | null;
  /** Added to the failure roll: the sum of the negative SCR modifiers, as a positive number */
  failureModifier: number;
  failure: EnchantmentFailure | null;
}

export interface EnchantmentProjectProps {
  id: string;
  gameId: string;
  alchemistId: string;
  alchemistName: string;
  itemId: string;
  itemName: string;
  request: EnchantmentRequest;
  plan: EnchantmentPlan;
  scr: EnchantmentScr[];
  status: EnchantmentStatus;
  daysCompleted: number;
  extraDays: number;
  /** Gold of the extra costs of the failure results, charged to the payer */
  extraCost: number;
  notes: string | null;
  payer: ItemHolder | null;
  /** Gold the payer gave: the materials at the start and the rises of the extra cost */
  paid: number;
  /** Gold given back: the cuts of the extra cost and the refund of a cancel */
  refunded: number;
  ledgerEntryIds: string[];
  owner: string;
  createdAt: Date;
  updatedAt: Date | null;
  completedAt: Date | null;
}

export interface NewEnchantmentProject {
  id?: string;
  gameId: string;
  alchemistId: string;
  alchemistName: string;
  itemId: string;
  itemName: string;
  request: EnchantmentRequest;
  plan: EnchantmentPlan;
  /** The open-ended roll of each spell, by spell id */
  scrRolls: Record<string, number>;
  payer: ItemHolder | null;
  paid: number;
  ledgerEntryIds: string[];
  owner: string;
}

/** Looks a failure result up in a table of core. */
export type FailureLookup = (table: AlchemyFailureTable, result: number) => AlchemyFailureRow | null;

const statusError = (message: string) => new ConflictError(message, 'err-enchantment-status');

/** Rules of the Spellcasting Rolls of an enchantment (workspace spec 064). */
export const EnchantmentScrRules = {
  resolve(plan: EnchantmentPlan, scrRolls: Record<string, number>): EnchantmentScr[] {
    return plan.spells.map(spell => {
      const roll = scrRolls?.[spell.spellId];
      if (typeof roll !== 'number' || !Number.isInteger(roll)) {
        throw new ValidationError(`The SCR roll of spell ${spell.spellId} is required`, 'err-enchantment-scr-roll-required');
      }
      const total = roll + spell.scrBonus;
      const failed = total <= 0;
      const negative = spell.scrModifiers.filter(modifier => modifier.value < 0).reduce((sum, modifier) => sum + modifier.value, 0);
      return {
        spellId: spell.spellId,
        roll,
        total,
        failed,
        failureRoll: null,
        failureModifier: failed ? Math.abs(negative) : 0,
        failure: null,
      };
    });
  },

  pending(scr: EnchantmentScr[]): boolean {
    return scr.some(entry => entry.failed && entry.failureRoll === null);
  },
};

/**
 * An alchemist enchanting an item (workspace spec 064, decision 6): the SCRs made at the start, the failure rolls,
 * the days worked (by hand, decision 8), the adjustments of the failure results, and how it ended.
 */
export class EnchantmentProject extends BaseAggregateRoot<EnchantmentProjectProps> {
  private constructor(private props: EnchantmentProjectProps) {
    super(props.id);
  }

  static start(input: NewEnchantmentProject): EnchantmentProject {
    const scr = EnchantmentScrRules.resolve(input.plan, input.scrRolls);
    return new EnchantmentProject({
      id: input.id ?? randomUUID(),
      gameId: input.gameId,
      alchemistId: input.alchemistId,
      alchemistName: input.alchemistName,
      itemId: input.itemId,
      itemName: input.itemName,
      request: input.request,
      plan: input.plan,
      scr,
      status: EnchantmentScrRules.pending(scr) ? 'pending-failures' : 'in-progress',
      daysCompleted: 0,
      extraDays: 0,
      extraCost: 0,
      notes: null,
      payer: input.payer,
      paid: round2(input.paid),
      refunded: 0,
      ledgerEntryIds: [...input.ledgerEntryIds],
      owner: input.owner,
      createdAt: new Date(),
      updatedAt: null,
      completedAt: null,
    });
  }

  static fromProps(props: EnchantmentProjectProps): EnchantmentProject {
    return new EnchantmentProject(props);
  }

  get status(): EnchantmentStatus {
    return this.props.status;
  }

  get gameId(): string {
    return this.props.gameId;
  }

  get alchemistId(): string {
    return this.props.alchemistId;
  }

  get itemId(): string {
    return this.props.itemId;
  }

  get payer(): ItemHolder | null {
    return this.props.payer;
  }

  get plan(): EnchantmentPlan {
    return this.props.plan;
  }

  get owner(): string {
    return this.props.owner;
  }

  /** Working days plus the extra days of the failure results. */
  get totalDays(): number {
    return this.props.plan.workingDays + this.props.extraDays;
  }

  get remainingDays(): number {
    return Math.max(0, this.totalDays - this.props.daysCompleted);
  }

  isActive(): boolean {
    return ACTIVE_ENCHANTMENT_STATUSES.includes(this.props.status);
  }

  /** The failure rolls of the failed spells, by spell id; the project goes on when every failure has its roll. */
  applyFailureRolls(rolls: Record<string, number>, lookup: FailureLookup): void {
    if (this.props.status !== 'pending-failures') throw statusError(`Project ${this.id} has no failure rolls pending`);
    const entries = Object.entries(rolls ?? {});
    if (entries.length === 0) throw new ValidationError('No failure rolls were sent', 'validation');
    const scr = this.props.scr.map(entry => ({ ...entry }));
    for (const [spellId, roll] of entries) {
      const entry = scr.find(candidate => candidate.spellId === spellId);
      if (!entry || !entry.failed) {
        throw new ValidationError(`Spell ${spellId} has no failed SCR in this project`, 'err-enchantment-spell-unknown');
      }
      if (typeof roll !== 'number' || !Number.isInteger(roll)) throw new ValidationError(`Invalid failure roll ${roll}`, 'validation');
      const spell = this.props.plan.spells.find(candidate => candidate.spellId === spellId)!;
      const row = lookup(spell.failureTable, roll + entry.failureModifier);
      entry.failureRoll = roll;
      entry.failure = row
        ? {
            table: spell.failureTable,
            min: row.min,
            max: row.max,
            text: row.text,
            ...(row.serendipity ? { serendipity: row.serendipity } : {}),
          }
        : null;
    }
    this.props.scr = scr;
    if (!EnchantmentScrRules.pending(scr)) this.props.status = 'in-progress';
    this.touch();
  }

  /** Days worked: never beyond the days the project needs. */
  progress(days: number): void {
    if (!Number.isInteger(days) || days < 1) throw new ValidationError(`Invalid days ${days}`, 'validation');
    this.checkWorking('progress');
    this.props.daysCompleted = Math.min(this.props.daysCompleted + days, this.totalDays);
    this.touch();
  }

  suspend(): void {
    if (this.props.status !== 'in-progress') throw statusError(`Project ${this.id} is ${this.props.status}, not in progress`);
    this.props.status = 'suspended';
    this.touch();
  }

  resume(): void {
    if (this.props.status !== 'suspended') throw statusError(`Project ${this.id} is ${this.props.status}, not suspended`);
    this.props.status = 'in-progress';
    this.touch();
  }

  /**
   * Extra days and costs of the failure results, and the notes. Returns the gold the payer has to give (positive) or
   * gets back (negative) for the change of the extra cost.
   */
  adjust(changes: { extraDays?: number; extraCost?: number; notes?: string | null }): number {
    if (!this.isActive()) throw statusError(`Project ${this.id} is ${this.props.status}`);
    if (changes.extraDays !== undefined) {
      if (!Number.isInteger(changes.extraDays) || changes.extraDays < 0) {
        throw new ValidationError(`Invalid extra days ${changes.extraDays}`, 'validation');
      }
      this.props.extraDays = changes.extraDays;
      // Fewer extra days never leave more days worked than the project needs
      this.props.daysCompleted = Math.min(this.props.daysCompleted, this.totalDays);
    }
    let delta = 0;
    if (changes.extraCost !== undefined) {
      if (!Number.isFinite(changes.extraCost) || changes.extraCost < 0) {
        throw new ValidationError(`Invalid extra cost ${changes.extraCost}`, 'validation');
      }
      const extraCost = round2(changes.extraCost);
      delta = round2(extraCost - this.props.extraCost);
      this.props.extraCost = extraCost;
    }
    if (changes.notes !== undefined) this.props.notes = changes.notes?.trim() || null;
    this.touch();
    return delta;
  }

  /** Gold that moved for the project (positive: paid by the payer, negative: given back) and its ledger entry. */
  recordPayment(gold: number, ledgerEntryId: string | null): void {
    if (gold > 0) this.props.paid = round2(this.props.paid + gold);
    else this.props.refunded = round2(this.props.refunded - gold);
    if (ledgerEntryId) this.props.ledgerEntryIds = [...this.props.ledgerEntryIds, ledgerEntryId];
    this.touch();
  }

  /** Every day worked: the item can be enchanted. */
  checkCompletable(): void {
    this.checkWorking('complete');
    if (this.props.daysCompleted < this.totalDays) {
      throw new ConflictError(`Project ${this.id} has ${this.remainingDays} days left`, 'err-enchantment-not-finished');
    }
  }

  complete(at: Date = new Date()): void {
    this.checkCompletable();
    this.props.status = 'completed';
    this.props.completedAt = at;
    this.touch();
  }

  /** Gold the payer still has in the project: what it paid less what it got back. */
  get netPaid(): number {
    return round2(this.props.paid - this.props.refunded);
  }

  /** What a cancel gives back: the share of the gold paid (net) for the days not worked. */
  refundAmount(): number {
    const total = this.totalDays;
    if (total <= 0) return this.netPaid;
    return round2((this.netPaid * this.remainingDays) / total);
  }

  checkCancellable(): void {
    if (!this.isActive()) throw statusError(`Project ${this.id} is ${this.props.status}`);
  }

  cancel(refund: number, ledgerEntryId: string | null): void {
    this.checkCancellable();
    this.props.status = 'cancelled';
    this.props.refunded = round2(this.props.refunded + refund);
    if (ledgerEntryId) this.props.ledgerEntryIds = [...this.props.ledgerEntryIds, ledgerEntryId];
    this.touch();
  }

  /** Only a finished project is deleted: an active one holds gold and an item. */
  checkDeletable(): void {
    if (this.isActive()) throw statusError(`Project ${this.id} is ${this.props.status}: complete or cancel it first`);
  }

  private checkWorking(action: string): void {
    if (this.props.status === 'pending-failures') {
      throw new ConflictError(`Project ${this.id} has failure rolls pending`, 'err-enchantment-failure-rolls-pending');
    }
    if (this.props.status !== 'in-progress') throw statusError(`Project ${this.id} is ${this.props.status}: it cannot ${action}`);
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  getProps(): EnchantmentProjectProps {
    return this.props;
  }
}

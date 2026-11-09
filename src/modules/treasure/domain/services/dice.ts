import { ValidationError } from '../../../shared/domain/errors/errors.js';

/** What a die is for: the table it reads and the modifier added to it. */
export interface DiePurpose {
  table: string;
  modifier?: number;
}

/** The dice of a treasure (workspace spec 094): the generator only asks for numbers, the client rolls them. */
export interface Dice {
  /** A whole number from `min` to `max`, both included. */
  roll(min: number, max: number, purpose?: DiePurpose): number;
}

/** The next die the client has to roll. */
export interface TreasurePendingRoll {
  table: string;
  min: number;
  max: number;
  modifier: number;
}

/** Raised when the generator needs a die the client has not sent yet. */
export class TreasureRollPending extends Error {
  constructor(readonly pending: TreasurePendingRoll) {
    super(`Treasure needs a die for ${pending.table}`);
    this.name = 'TreasureRollPending';
    Object.setPrototypeOf(this, TreasureRollPending.prototype);
  }
}

/** The dice rolled by the client, in order; a range with a single value needs no die. */
export class ProvidedDice implements Dice {
  private used = 0;

  constructor(private readonly values: readonly number[]) {}

  get unused(): number {
    return this.values.length - this.used;
  }

  roll(min: number, max: number, purpose?: DiePurpose): number {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    if (high <= low) return low;
    const table = purpose?.table ?? '-';
    if (this.used >= this.values.length) {
      throw new TreasureRollPending({ table, min: low, max: high, modifier: purpose?.modifier ?? 0 });
    }
    const value = this.values[this.used];
    if (value < low || value > high) {
      throw new ValidationError(`Die ${this.used + 1} of ${table} must be from ${low} to ${high}`, 'err-treasure-die-out-of-range');
    }
    this.used++;
    return value;
  }
}

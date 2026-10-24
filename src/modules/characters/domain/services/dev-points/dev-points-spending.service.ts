import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { CharacterXP } from '../../value-objects/character-xp.vo.js';

export type DevPointsPool = 'normal' | 'bonus' | 'flaw';

// Points taken from each pool. Negative values are points granted (flaws)
export interface DevPointsPayment {
  normal: number;
  bonus: number;
  flaw: number;
  // Part of the bonus points that counted towards the per level limit
  cappedBonus: number;
}

export interface DevPointsSpendOptions {
  // Maximum bonus development points spendable in a single level (power level raceDevPointsPerLevel)
  bonusDevPointsPerLevel: number;
  // Pools to draw from, in order. Default: normal points first, then bonus points
  pools?: DevPointsPool[];
  // When false the bonus points are not limited and do not count towards the per level limit (talents at creation)
  capBonus?: boolean;
}

export const emptyPayment = (): DevPointsPayment => ({ normal: 0, bonus: 0, flaw: 0, cappedBonus: 0 });

const DEFAULT_POOLS: DevPointsPool[] = ['normal', 'bonus'];

/**
 * Spends and refunds development points over the three pools of a character:
 * - normal: the points of the current level;
 * - bonus: race extra points plus the game master creation bonus, limited per level;
 * - flaw: points returned by flaws at creation under the 'flaw-points-at-creation' talent policy.
 */
export class DevPointsSpendingService {
  static availableBonus(xp: CharacterXP, options: DevPointsSpendOptions): number {
    const pool = Math.max(0, xp.availableBonusDevPoints || 0);
    if (options.capBonus === false) {
      return pool;
    }
    const remaining = Math.max(0, options.bonusDevPointsPerLevel - (xp.bonusDevPointsSpentThisLevel || 0));
    return Math.min(pool, remaining);
  }

  static available(xp: CharacterXP, options: DevPointsSpendOptions): number {
    return (options.pools ?? DEFAULT_POOLS).reduce((sum, pool) => sum + this.availableIn(xp, pool, options), 0);
  }

  static canSpend(xp: CharacterXP, cost: number, options: DevPointsSpendOptions): boolean {
    return cost <= this.available(xp, options);
  }

  static spend(xp: CharacterXP, cost: number, options: DevPointsSpendOptions, onInsufficient?: () => Error): DevPointsPayment {
    const payment = emptyPayment();
    let remaining = Math.max(0, cost);
    for (const pool of options.pools ?? DEFAULT_POOLS) {
      const taken = Math.min(this.availableIn(xp, pool, options), remaining);
      payment[pool] += taken;
      remaining -= taken;
    }
    if (remaining > 0) {
      throw onInsufficient ? onInsufficient() : new ValidationError('Insufficient development points');
    }
    xp.availableDevPoints = (xp.availableDevPoints || 0) - payment.normal;
    xp.availableBonusDevPoints = (xp.availableBonusDevPoints || 0) - payment.bonus;
    xp.flawDevPoints = (xp.flawDevPoints || 0) - payment.flaw;
    if (options.capBonus !== false) {
      payment.cappedBonus = payment.bonus;
      xp.bonusDevPointsSpentThisLevel = (xp.bonusDevPointsSpentThisLevel || 0) + payment.bonus;
    }
    return payment;
  }

  // Adds the points a flaw returns to a pool. The payment is negative
  static grant(xp: CharacterXP, amount: number, pool: 'normal' | 'flaw'): DevPointsPayment {
    const payment = emptyPayment();
    payment[pool] = -amount;
    if (pool === 'normal') {
      xp.availableDevPoints = (xp.availableDevPoints || 0) + amount;
    } else {
      xp.flawDevPoints = (xp.flawDevPoints || 0) + amount;
    }
    return payment;
  }

  /**
   * Returns the points of a payment to the pools they came from. When the payment was made in the current level its
   * capped bonus points are released from the per level limit. Undoing a flaw takes its points back, and fails when
   * they have already been spent.
   */
  static refund(xp: CharacterXP, payment: DevPointsPayment, sameLevel: boolean): void {
    const normal = (xp.availableDevPoints || 0) + payment.normal;
    const bonus = (xp.availableBonusDevPoints || 0) + payment.bonus;
    const flaw = (xp.flawDevPoints || 0) + payment.flaw;
    if ((payment.normal < 0 && normal < 0) || (payment.bonus < 0 && bonus < 0) || (payment.flaw < 0 && flaw < 0)) {
      throw new ValidationError('Insufficient development points to undo the operation: the points have already been spent');
    }
    xp.availableDevPoints = normal;
    xp.availableBonusDevPoints = bonus;
    xp.flawDevPoints = flaw;
    if (sameLevel && payment.cappedBonus > 0) {
      xp.bonusDevPointsSpentThisLevel = Math.max(0, (xp.bonusDevPointsSpentThisLevel || 0) - payment.cappedBonus);
    }
  }

  private static availableIn(xp: CharacterXP, pool: DevPointsPool, options: DevPointsSpendOptions): number {
    switch (pool) {
      case 'normal':
        return Math.max(0, xp.availableDevPoints || 0);
      case 'bonus':
        return this.availableBonus(xp, options);
      case 'flaw':
        return Math.max(0, xp.flawDevPoints || 0);
    }
  }
}

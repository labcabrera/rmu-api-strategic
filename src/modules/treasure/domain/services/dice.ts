import { randomInt } from 'crypto';

/** Dice of the server (workspace spec 067, decision 10): injectable, so the tests roll fixed numbers. */
export interface Dice {
  /** A whole number from `min` to `max`, both included. */
  roll(min: number, max: number): number;
}

export const DICE = Symbol('Dice');

export const RandomDice: Dice = {
  roll(min: number, max: number): number {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return high <= low ? low : randomInt(low, high + 1);
  },
};

import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { PoisonSeverity } from '../../value-objects/poison.vo.js';

/** What a poison RR needs of core's psychology tables (Table 5-6), imported from the rulebook data, never in code. */
export interface PoisonRrRules {
  requiredTotal: number;
  attackLevelMultiplier: number;
  bands: { min: number | null; max: number | null; severity: PoisonSeverity }[];
}

export interface PoisonRrModifier {
  key: string;
  value: number;
}

export interface PoisonRrResult {
  roll: number;
  bonus: number;
  attackLevel: number;
  breakdown: PoisonRrModifier[];
  total: number;
  required: number;
  resisted: boolean;
  failure: number;
  severity?: PoisonSeverity;
}

const D100 = 100;
const HIGH_FROM = 96;
const LOW_TO = 5;

/** An open-ended d100 (§5.1), for a poison RR the client leaves to the server. */
export const openEndedRoll = (random: () => number = Math.random): number => {
  const d100 = () => Math.floor(random() * D100) + 1;
  const first = d100();
  let total = first;
  if (first >= HIGH_FROM || first <= LOW_TO) {
    const sign = first >= HIGH_FROM ? 1 : -1;
    let next: number;
    do {
      next = d100();
      total += sign * next;
    } while (next >= HIGH_FROM);
  }
  return total;
};

/**
 * A poison RR (workspace spec 042, decision 8): roll + the character's poison bonus + modifiers + the attack level
 * multiplier times the poison level, against the required total. The failure margin gives the severity.
 */
export class PoisonRr {
  static resolve(roll: number, bonus: number, level: number, modifiers: PoisonRrModifier[], rules: PoisonRrRules): PoisonRrResult {
    if (!Number.isFinite(roll) || !Number.isFinite(bonus) || !Number.isFinite(level)) {
      throw new ValidationError('A poison RR needs a roll, a bonus and a level', 'err-resistance-roll-invalid');
    }
    const breakdown: PoisonRrModifier[] = [
      { key: 'roll', value: roll },
      { key: 'poison-rr', value: bonus },
      { key: 'attack-level', value: rules.attackLevelMultiplier * level },
      ...modifiers.filter(modifier => modifier.value).map(modifier => ({ ...modifier })),
    ];
    const total = breakdown.reduce((sum, modifier) => sum + modifier.value, 0);
    const failure = Math.max(0, rules.requiredTotal - total);
    const result: PoisonRrResult = {
      roll,
      bonus,
      attackLevel: level,
      breakdown,
      total,
      required: rules.requiredTotal,
      resisted: failure === 0,
      failure,
    };
    if (failure > 0) {
      const band = rules.bands.find(each => (each.min === null || failure >= each.min) && (each.max === null || failure <= each.max));
      result.severity = band?.severity;
    }
    return result;
  }
}

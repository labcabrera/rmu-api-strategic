import { ValidationError } from '../../../../shared/domain/errors/errors';
import { StatKey } from '../../value-objects/character-stat.vo';

// Development points of each extra stat gain roll
export const STAT_GAIN_DEV_POINTS_COST = 4;
export const STAT_MIN_VALUE = 1;
export const STAT_MAX_VALUE = 100;

export interface RollRange {
  min: number;
  max: number;
}

// Die of a stat gain roll by current temporary value (same bands as the stat level up dialog of the UI)
export const getStatGainRollRange = (temporary: number): RollRange => {
  if (temporary < 7) return { min: 0, max: 2 };
  if (temporary < 9) return { min: 1, max: 3 };
  if (temporary < 19) return { min: 1, max: 6 };
  if (temporary < 82) return { min: 1, max: 10 };
  if (temporary < 91) return { min: 1, max: 6 };
  if (temporary < 93) return { min: 1, max: 3 };
  return { min: 0, max: 2 };
};

export interface StatValues {
  potential: number;
  temporary: number;
}

// Validates the stats of a new character: values between 1 and 100 and temporary not above potential
export const validateCreationStats = (statistics: Partial<Record<StatKey, StatValues>>, keys: StatKey[]): void => {
  keys.forEach(key => {
    const stat = statistics[key];
    const valid = (value: unknown) =>
      typeof value === 'number' && Number.isInteger(value) && value >= STAT_MIN_VALUE && value <= STAT_MAX_VALUE;
    if (!stat || !valid(stat.potential) || !valid(stat.temporary)) {
      throw new ValidationError(`Stat ${key} values must be between ${STAT_MIN_VALUE} and ${STAT_MAX_VALUE}`, 'err-stat-out-of-range');
    }
    if (stat.temporary > stat.potential) {
      throw new ValidationError(
        `Stat ${key} temporary value ${stat.temporary} is above its potential ${stat.potential}`,
        'err-stat-temporary-above-potential',
      );
    }
  });
};

// Point-buy generation: the sum of the bonuses of the temporary values cannot exceed the budget
export const validateStatPoints = (statistics: Partial<Record<StatKey, StatValues>>, keys: StatKey[], statPoints: number): void => {
  const spent = keys.reduce((sum, key) => sum + getStatBonus(statistics[key]?.temporary), 0);
  if (spent > statPoints) {
    throw new ValidationError(`Stat bonuses add up to ${spent} points, the game allows up to ${statPoints}`, 'err-stat-points-exceeded');
  }
};

// Stat bonus by temporary value
export const getStatBonus = (temporary: number | undefined): number => {
  if (!temporary) {
    return 0;
  }
  switch (temporary) {
    case 1:
      return -15;
    case 2:
      return -14;
    case 3:
      return -13;
    case 4:
      return -12;
    case 5:
      return -11;
    case 6:
      return -10;
    case 7:
    case 8:
      return -9;
    case 9:
    case 10:
    case 11:
      return -8;
    case 12:
    case 13:
    case 14:
      return -7;
    case 15:
    case 16:
    case 17:
      return -6;
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
    case 23:
      return -5;
    case 24:
    case 25:
    case 26:
    case 27:
    case 28:
    case 29:
      return -4;
    case 30:
    case 31:
    case 32:
    case 33:
    case 34:
    case 35:
      return -3;
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
    case 41:
      return -2;
    case 42:
    case 43:
    case 44:
    case 45:
    case 46:
    case 47:
      return -1;
    case 48:
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
      return 0;
    case 54:
    case 55:
    case 56:
    case 57:
    case 58:
    case 59:
      return 1;
    case 60:
    case 61:
    case 62:
    case 63:
    case 64:
    case 65:
      return 2;
    case 66:
    case 67:
    case 68:
    case 69:
    case 70:
    case 71:
      return 3;
    case 72:
    case 73:
    case 74:
    case 75:
    case 76:
    case 77:
      return 4;
    case 78:
    case 79:
    case 80:
    case 81:
    case 82:
    case 83:
      return 5;
    case 84:
    case 85:
    case 86:
      return 6;
    case 87:
    case 88:
    case 89:
      return 7;
    case 90:
    case 91:
    case 92:
      return 8;
    case 93:
    case 94:
      return 9;
    case 95:
      return 10;
    case 96:
      return 11;
    case 97:
      return 12;
    case 98:
      return 13;
    case 99:
      return 14;
    case 100:
      return 15;
    default:
      throw new ValidationError('Invalid temporary value');
  }
};

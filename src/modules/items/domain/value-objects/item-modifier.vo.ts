import { ValidationError } from '../../../shared/domain/errors/errors';

/** Kind of modifier of an item (spec 019): breakage damage, quality or material, or anything else of the game master. */
export type ItemModifierType = 'breakage' | 'quality' | 'custom';
export const ITEM_MODIFIER_TYPES: ItemModifierType[] = ['breakage', 'quality', 'custom'];

/** Uses of the item the modifier applies to: every use, only its breakage checks, or one kind of use. */
export type ItemModifierTarget = 'all' | 'breakage' | 'attack' | 'defense' | 'maneuver';
export const ITEM_MODIFIER_TARGETS: ItemModifierTarget[] = ['all', 'breakage', 'attack', 'defense', 'maneuver'];

export interface ItemModifierSource {
  kind: 'tactical' | 'manual';
  tacticalGameId?: string;
  tacticalGameName?: string;
  round?: number;
  actionId?: string;
}

/** A modifier of an item (spec 019, decision 2). Breakage damage is `type: 'breakage', appliesTo: 'all'`. */
export interface ItemModifier {
  id: string;
  type: ItemModifierType;
  value: number;
  appliesTo: ItemModifierTarget;
  /** Only breakage: the item is broken. */
  broken?: boolean;
  /** Only in tactical games: damage that does not last after the game. Never stored in a strategic item. */
  temporary?: boolean;
  source?: ItemModifierSource;
  description?: string;
  createdAt: string;
}

/** State of an item derived from its breakage modifiers (spec 019, decision 3). */
export interface ItemCondition {
  /** Sum of the breakage modifiers, never above 0: a partial repair is a positive one. */
  breakagePenalty: number;
  broken: boolean;
}

/** Breakage damage beyond which an armor piece leaves its area unprotected (§6.1). */
export const UNPROTECTED_ARMOR_PENALTY = -50;

export const ItemModifiers = {
  validate(modifier: ItemModifier): void {
    if (!modifier.id) throw new ValidationError('An item modifier requires an id', 'err-item-modifier-invalid');
    if (!ITEM_MODIFIER_TYPES.includes(modifier.type)) {
      throw new ValidationError(`Invalid item modifier type ${modifier.type}`, 'err-item-modifier-invalid');
    }
    if (!ITEM_MODIFIER_TARGETS.includes(modifier.appliesTo)) {
      throw new ValidationError(`Invalid item modifier target ${modifier.appliesTo}`, 'err-item-modifier-invalid');
    }
    if (typeof modifier.value !== 'number' || !Number.isFinite(modifier.value)) {
      throw new ValidationError('An item modifier requires a numeric value', 'err-item-modifier-invalid');
    }
    if (modifier.broken && modifier.type !== 'breakage') {
      throw new ValidationError('Only a breakage modifier can break an item', 'err-item-modifier-invalid');
    }
  },

  condition(modifiers: ItemModifier[] | undefined): ItemCondition {
    const breakage = (modifiers || []).filter(modifier => modifier.type === 'breakage');
    const sum = breakage.reduce((total, modifier) => total + (modifier.value || 0), 0);
    return { breakagePenalty: Math.min(0, sum), broken: breakage.some(modifier => !!modifier.broken) };
  },

  /** Sum of the modifiers that are not breakage and apply to the given use (or to every use). */
  bonus(modifiers: ItemModifier[] | undefined, target: Exclude<ItemModifierTarget, 'all'>): number {
    return (modifiers || [])
      .filter(modifier => modifier.type !== 'breakage' && (modifier.appliesTo === 'all' || modifier.appliesTo === target))
      .reduce((total, modifier) => total + (modifier.value || 0), 0);
  },

  /** The armor piece no longer protects its area: broken, or damaged beyond -50. */
  isUnprotected(condition: ItemCondition): boolean {
    return condition.broken || condition.breakagePenalty < UNPROTECTED_ARMOR_PENALTY;
  },
};

import { randomUUID } from 'crypto';
import type { MagicItemBonus, MagicItemFeature } from '../value-objects/item-catalog-info.vo.js';
import type { ItemCharges, ItemEnchantment, ItemEnchantmentProperty, ItemEnchantmentSource } from '../value-objects/item-enchantment.vo.js';
import type { ItemModifier, ItemModifierSourceKind, ItemModifierTarget } from '../value-objects/item-modifier.vo.js';

/** Description of the breakage modifier of the item level (the same key as the enchantments of workspace spec 064). */
export const MAGIC_ITEM_LEVEL_DESCRIPTION = 'enchantment-item-level';

/** Description of an OB or DB modifier of a magic item (clients translate it): `magic-ob`, `magic-db`, `magic-shield`. */
export const magicBonusDescription = (kind: 'ob' | 'db' | 'shield') => `magic-${kind}`;

/** What a magic item gets when it is created (workspace spec 067, decision 5). */
export interface MagicItemMapping {
  enchantment: ItemEnchantment;
  modifiers: ItemModifier[];
  charges: ItemCharges | null;
}

/** Whether the item uses its OB or DB in combat, so the item level goes to its breakage checks (spec 064, decision 6). */
export interface MagicItemUse {
  breakable: boolean;
}

const MODIFIER_SOURCE: Record<ItemEnchantmentSource, ItemModifierSourceKind> = {
  alchemy: 'enchantment',
  catalog: 'catalog-magic',
  treasure: 'treasure',
  manual: 'manual',
};

/**
 * Pure rules of a magic item of the catalog, of a treasure or of the game master (workspace spec 067, decision 5):
 * - an `ob` bonus is an `enchantment` modifier of the attack, `db` and `shield` of the defense; with `against` it only
 *   applies sometimes, so it stays a descriptive property;
 * - every other bonus is a descriptive property of the same kind, as in workspace spec 064;
 * - the item level goes to the breakage checks of a weapon, armor or shield;
 * - charged items start full.
 */
export const MagicItemMappings = {
  map(feature: MagicItemFeature, source: ItemEnchantmentSource, use: MagicItemUse, now: Date = new Date()): MagicItemMapping {
    const createdAt = now.toISOString();
    const modifierSource = { kind: MODIFIER_SOURCE[source] };
    const modifier = (appliesTo: ItemModifierTarget, value: number, description: string): ItemModifier => ({
      id: randomUUID(),
      type: 'enchantment',
      value,
      appliesTo,
      source: { ...modifierSource },
      description,
      createdAt,
    });

    const modifiers: ItemModifier[] = [];
    const properties: ItemEnchantmentProperty[] = [];
    for (const bonus of feature.bonuses ?? []) {
      const target = MagicItemMappings.modifierTarget(bonus);
      if (target && (bonus.kind === 'ob' || bonus.kind === 'db' || bonus.kind === 'shield')) {
        modifiers.push(modifier(target, bonus.value, magicBonusDescription(bonus.kind)));
      } else {
        properties.push({
          kind: bonus.kind,
          value: bonus.value,
          target: bonus.target ?? null,
          ...(bonus.against ? { against: bonus.against } : {}),
        });
      }
    }
    if (use.breakable && feature.itemLevel > 0 && modifiers.length > 0) {
      modifiers.push(modifier('breakage', feature.itemLevel, MAGIC_ITEM_LEVEL_DESCRIPTION));
    }
    const max = feature.charges;
    return {
      enchantment: {
        source,
        projectId: null,
        itemLevel: feature.itemLevel ?? 0,
        kind: feature.kind ?? null,
        attunement: !!feature.attunement,
        alchemistId: null,
        alchemistName: null,
        spells: (feature.spells ?? []).map(spell => ({
          spellId: null,
          name: spell.name,
          level: spell.level,
          listCode: spell.list ?? null,
          use: spell.use ?? null,
          perDay: spell.perDay ?? null,
        })),
        properties,
        completedAt: createdAt,
      },
      modifiers,
      charges: typeof max === 'number' && max > 0 ? { max, current: max } : null,
    };
  },

  /** The use an OB or DB bonus applies to; null when it only applies against a creature type, or for other bonuses. */
  modifierTarget(bonus: MagicItemBonus): Extract<ItemModifierTarget, 'attack' | 'defense'> | null {
    if (bonus.against) return null;
    if (bonus.kind === 'ob') return 'attack';
    if (bonus.kind === 'db' || bonus.kind === 'shield') return 'defense';
    return null;
  },

  /** The part of the standard price that is magic (decision 6): the standard price without the base item. */
  enchantmentPart(feature: MagicItemFeature | null | undefined): number {
    if (!feature || feature.standardPrice === null || feature.standardPrice === undefined) return 0;
    return Math.max(0, feature.standardPrice - (feature.basePrice ?? 0));
  },
};

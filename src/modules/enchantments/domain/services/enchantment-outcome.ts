import { randomUUID } from 'crypto';
import type { ItemEnchantment, ItemEnchantmentProperty } from '../../../items/domain/value-objects/item-enchantment.vo.js';
import type { ItemModifier, ItemModifierTarget } from '../../../items/domain/value-objects/item-modifier.vo.js';
import type { EnchantmentProjectProps } from '../aggregates/enchantment-project.js';
import { round2 } from './enchantment-planner.js';

/** Description of the breakage modifier of the item level (clients translate it). */
export const ITEM_LEVEL_DESCRIPTION = 'enchantment-item-level';

/** The item before it is enchanted: its material bonus and the use that bonus goes to (decision 7). */
export interface EnchantedItemInfo {
  materialBonus: number;
  /** Use the material bonus applies to (attack for a weapon, defense for a shield or torso armor); null for none */
  materialTarget: Exclude<ItemModifierTarget, 'all' | 'breakage'> | null;
}

export interface EnchantmentOutcome {
  enchantment: ItemEnchantment;
  modifiers: ItemModifier[];
  /** Value of one unit: the market value over the batch */
  unitValue: number;
}

/**
 * What a completed project makes of the item (workspace spec 064, decisions 6 and 7):
 * - attack and defense effects are modifiers of that use; the magic bonus does not add to the bonus of the material on
 *   the same use, so the modifier is only what it adds over the material (never below 0) and its description says the
 *   total;
 * - a skill effect is a conditional maneuver modifier with the skill as its condition (shown, not added), and a property;
 * - spell adders and PP multipliers are only properties;
 * - the item level is added to its breakage checks (a modifier of the enchantment applied to breakage, like the
 *   durability of a material, so that it is not taken as breakage damage).
 */
export const EnchantmentOutcomes = {
  resolve(project: EnchantmentProjectProps, item: EnchantedItemInfo, completedAt: Date): EnchantmentOutcome {
    const { plan } = project;
    const now = completedAt.toISOString();
    const source = {
      kind: 'enchantment' as const,
      projectId: project.id,
      crafterId: project.alchemistId,
      crafterName: project.alchemistName,
    };
    const modifier = (appliesTo: ItemModifierTarget, value: number, description: string, condition?: string): ItemModifier => ({
      id: randomUUID(),
      type: 'enchantment',
      value,
      appliesTo,
      source: { ...source },
      description,
      ...(condition ? { condition } : {}),
      createdAt: now,
    });

    const modifiers: ItemModifier[] = [];
    const properties: ItemEnchantmentProperty[] = [];
    for (const spell of plan.spells) {
      const effect = spell.effect;
      if (!effect) continue;
      switch (effect.kind) {
        case 'attack':
        case 'defense': {
          const material = item.materialTarget === effect.kind ? Math.max(0, item.materialBonus) : 0;
          const total = Math.max(effect.value, material);
          modifiers.push(modifier(effect.kind, Math.max(0, effect.value - material), `${spell.name} (+${total})`));
          break;
        }
        case 'skill':
          // The skill chosen in the request; without one, the spell name keeps it out of the sums of the sheet
          modifiers.push(modifier('maneuver', effect.value, spell.name, spell.target ?? spell.name));
          properties.push({ kind: 'skill', value: effect.value, target: spell.target ?? null });
          break;
        case 'spell-adder':
        case 'pp-multiplier':
          properties.push({ kind: effect.kind, value: effect.value });
          break;
      }
    }
    modifiers.push(modifier('breakage', plan.itemLevel, ITEM_LEVEL_DESCRIPTION));

    return {
      enchantment: {
        source: 'alchemy',
        projectId: project.id,
        itemLevel: plan.itemLevel,
        kind: null,
        attunement: false,
        alchemistId: project.alchemistId,
        alchemistName: project.alchemistName,
        spells: plan.spells.map(spell => ({ spellId: spell.spellId, name: spell.name, level: spell.level, listCode: spell.listCode })),
        properties,
        completedAt: now,
      },
      modifiers,
      unitValue: round2(plan.marketValue / plan.batchSize),
    };
  },
};

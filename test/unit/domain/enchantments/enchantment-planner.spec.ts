import { describe, expect, it } from 'vitest';
import {
  EnchantmentPlanner,
  type EnchantmentPlannerInput,
  type EnchantmentPlannerSpell,
} from '../../../../src/modules/enchantments/domain/services/enchantment-planner.js';
import type { SpellAlchemy } from '../../../../src/modules/enchantments/domain/value-objects/alchemy.vo.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';

// Invented spells: only the levels and the per-unit flag of the book examples (Treasure Law 5.3), no rule text
let next = 0;
const spell = (level: number, alchemy: Partial<SpellAlchemy> | null = {}, props: Partial<EnchantmentPlannerSpell> = {}) => {
  next += 1;
  return {
    spellId: `spell-${next}`,
    name: `Spell ${next}`,
    level,
    listId: 'list-1',
    listCode: 'e2e-list',
    listSkillId: 'base-spell-list',
    type: alchemy ? 'alchemical' : 'utility',
    alchemy: alchemy ? { failureTable: 'bonus', perItem: false, alters: false, effect: null, ...alchemy } : null,
    scrModifiers: [
      { key: 'ranks', value: 10 },
      { key: 'realm-stat', value: 3 },
      { key: 'list-type', value: 5 },
    ],
    ...props,
  } satisfies EnchantmentPlannerSpell;
};
const work = (level: number) => spell(level, { perItem: true, alters: true });

const plan = (spells: EnchantmentPlannerSpell[], input: Partial<EnchantmentPlannerInput> = {}) =>
  EnchantmentPlanner.plan({
    spells,
    batchSize: 1,
    powerLevel: 'superior',
    powerMultiplier: 1,
    materialBonus: 0,
    baseValue: 0,
    alchemistPP: 100,
    ...input,
  });

describe('enchantment planner (workspace spec 064, acceptance 4)', () => {
  it('iron sword +5: a Work spell of level 5 and a weapon spell of level 4 take 9 days', () => {
    const result = plan([work(5), spell(4, { effect: { kind: 'attack', value: 5 } })]);
    expect(result).toMatchObject({ baseDays: 9, workingDays: 9, materialBonusReduction: 0, itemLevel: 5, ppPerDay: 9, maxAlchemists: 2 });
  });

  it('brooch: 20 days, 300 sp of materials and 340 sp of market value', () => {
    const result = plan([work(5), spell(15, { effect: { kind: 'skill', value: 15 } }, { target: 'fear' })]);
    expect(result).toMatchObject({ workingDays: 20, itemLevel: 15, ppPerDay: 20 });
    // In gold: 300 sp and 340 sp
    expect(result).toMatchObject({ materialCost: 30, laborCost: 4, enchantmentCost: 34, paidAtStart: 30, marketValue: 34 });
    expect(result.spells[1]).toMatchObject({ target: 'fear', effect: { kind: 'skill', value: 15 } });
  });

  it('batch of five headbands: 36 PP a day, 24 days, 360 sp and 408 sp', () => {
    const result = plan([work(3), spell(15), spell(6)], { batchSize: 5 });
    expect(result.spells.map(s => s.casts)).toEqual([5, 1, 1]);
    expect(result).toMatchObject({ ppPerDay: 36, workingDays: 24, materialCost: 36, enchantmentCost: 40.8, marketValue: 40.8 });
  });

  it('batch of five potions: 55 PP a day, 15 days, 135 sp and 180 sp (one more sp a day from 40 PP)', () => {
    const result = plan([work(1), spell(9, { perItem: true }), spell(5)], { batchSize: 5 });
    expect(result).toMatchObject({ ppPerDay: 55, workingDays: 15, itemLevel: 9, materialCost: 13.5, laborCost: 4.5, marketValue: 18 });
  });

  it('high steel sword (+10): 27 levels less the material bonus are 17 days, 238 sp of materials, 382 sp with a 110 sp sword', () => {
    const result = plan([work(9), spell(4, { effect: { kind: 'attack', value: 5 } }), spell(14)], { materialBonus: 10, baseValue: 11 });
    expect(result).toMatchObject({ baseDays: 27, materialBonusReduction: 10, workingDays: 17, itemLevel: 14 });
    expect(result).toMatchObject({ materialCost: 23.8, enchantmentCost: 27.2, marketValue: 38.2 });
  });

  it('iron sword with spells of levels 5, 8 and 14: 27 days, 378 sp of materials, 442 sp with a 10 sp sword', () => {
    const result = plan([work(5), spell(8, { effect: { kind: 'attack', value: 10 } }), spell(14)], { baseValue: 1 });
    expect(result).toMatchObject({ workingDays: 27, materialCost: 37.8, marketValue: 44.2 });
  });

  it('never takes off more than half the days for the material', () => {
    expect(plan([work(5), spell(4)], { materialBonus: 20 })).toMatchObject({ baseDays: 9, workingDays: 5, materialBonusReduction: 4 });
  });

  it('doubles or halves (rounding up) the days and PP of a spell by its scope', () => {
    const result = plan([work(5), spell(7, {}, { scope: 'doubled' }), spell(5, {}, { scope: 'halved' })]);
    expect(result.spells.map(s => [s.days, s.pp])).toEqual([
      [5, 5],
      [14, 14],
      [3, 3],
    ]);
    expect(result.workingDays).toBe(22);
  });

  it('multiplies the enchantment costs by the power level, not the base item', () => {
    const result = plan([work(5), spell(15)], { powerLevel: 'average', powerMultiplier: 1.5, baseValue: 10 });
    expect(result).toMatchObject({ materialCost: 30, enchantmentCost: 51, paidAtStart: 45, marketValue: 61 });
  });

  it('embeds a spell without alchemy metadata once, on the spell power failure table', () => {
    const result = plan([work(2), spell(3, null)], { batchSize: 4 });
    expect(result.spells[1]).toMatchObject({ perItem: false, casts: 1, failureTable: 'spell-power', type: 'utility', effect: null });
    expect(result.ppPerDay).toBe(11);
  });

  it('adds the SCR modifiers and warns when the PP a day exceed those of the alchemist', () => {
    const result = plan([work(5), spell(4)], { alchemistPP: 8 });
    expect(result.spells[0].scrBonus).toBe(18);
    expect(result.warnings).toEqual(['pp-per-day-above-character-pp']);
    expect(plan([work(5)], { alchemistPP: 5 }).warnings).toEqual([]);
  });

  it('needs an alchemical spell and a valid batch', () => {
    const error = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e as ValidationError;
      }
      throw new Error('no error');
    };
    expect(error(() => plan([spell(3, null)])).code).toBe('err-enchantment-no-alchemical-spell');
    expect(error(() => plan([])).code).toBe('err-enchantment-no-alchemical-spell');
    expect(error(() => plan([work(3)], { batchSize: 0 })).code).toBe('err-enchantment-batch-invalid');
  });
});

import { describe, expect, it } from 'vitest';
import { EnchantmentProject, EnchantmentScrRules } from '../../../../src/modules/enchantments/domain/aggregates/enchantment-project.js';
import { EnchantmentOutcomes, ITEM_LEVEL_DESCRIPTION } from '../../../../src/modules/enchantments/domain/services/enchantment-outcome.js';
import {
  EnchantmentPlanner,
  type EnchantmentPlannerSpell,
} from '../../../../src/modules/enchantments/domain/services/enchantment-planner.js';
import {
  findFailureRow,
  type AlchemyFailureRow,
  type SpellAlchemy,
} from '../../../../src/modules/enchantments/domain/value-objects/alchemy.vo.js';
import { ItemModifiers } from '../../../../src/modules/items/domain/value-objects/item-modifier.vo.js';
import type { DomainError } from '../../../../src/modules/shared/domain/errors/errors.js';

// Invented spells and failure rows (not book data)
const spell = (id: string, level: number, alchemy: Partial<SpellAlchemy> | null, listType = 5): EnchantmentPlannerSpell => ({
  spellId: id,
  name: `Spell ${id}`,
  level,
  listId: 'list-1',
  listCode: 'e2e-list',
  listSkillId: 'base-spell-list',
  type: alchemy ? 'alchemical' : 'utility',
  alchemy: alchemy ? { failureTable: 'bonus', perItem: false, alters: false, effect: null, ...alchemy } : null,
  scrModifiers: [
    { key: 'ranks', value: 8 },
    { key: 'realm-stat', value: -3 },
    { key: 'list-type', value: listType },
  ],
});

const ROWS: AlchemyFailureRow[] = [
  { min: 1, max: 50, text: 'Nothing happens' },
  { min: 51, max: 65, text: 'Days are lost' },
  { min: 66, max: 66, text: 'Lucky', serendipity: 'minor' },
  { min: 67, max: 165, text: 'Costs more' },
  { min: 166, max: 166, text: 'Very lucky', serendipity: 'major' },
  { min: 167, max: null, text: 'Ruined' },
];
const lookup = (_table: string, result: number) => findFailureRow(ROWS, result);

const PLAN = EnchantmentPlanner.plan({
  spells: [
    spell('work', 5, { perItem: true }),
    spell('weapon', 4, { effect: { kind: 'attack', value: 15 } }),
    spell('closed', 3, { failureTable: 'general', effect: { kind: 'skill', value: 10 } }, -5),
    spell('adder', 2, { failureTable: 'power-enhancer', effect: { kind: 'spell-adder', value: 1 } }),
  ],
  batchSize: 1,
  powerLevel: 'superior',
  powerMultiplier: 1,
  materialBonus: 0,
  baseValue: 2,
  alchemistPP: 50,
});
// 14 days, item level 5: 70 sp of materials, 28 sp of labour → 7 gold paid, 9.8 + 2 market

const start = (rolls: Record<string, number> = { work: 30, weapon: 40, closed: 50, adder: 20 }, paid = PLAN.paidAtStart) =>
  EnchantmentProject.start({
    gameId: 'game-1',
    alchemistId: 'alchemist-1',
    alchemistName: 'Alchemist',
    itemId: 'item-1',
    itemName: 'Sword',
    request: { alchemistId: 'alchemist-1', itemId: 'item-1', spells: PLAN.spells.map(s => ({ spellId: s.spellId })) },
    plan: PLAN,
    scrRolls: rolls,
    payer: { kind: 'character', id: 'alchemist-1' },
    paid,
    ledgerEntryIds: ['entry-1'],
    owner: 'user-1',
  });

const failure = (fn: () => unknown): DomainError => {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error('no error');
};

describe('enchantment SCRs and failures (workspace spec 064)', () => {
  it('adds the SCR modifiers to the roll; a total of 0 or less fails', () => {
    // Bonus: 8 - 3 + 5 = 10, or 0 on the closed list
    const scr = EnchantmentScrRules.resolve(PLAN, { work: -10, weapon: -9, closed: 1, adder: 0 });
    expect(scr.map(entry => [entry.spellId, entry.total, entry.failed])).toEqual([
      ['work', 0, true],
      ['weapon', 1, false],
      ['closed', 1, false],
      ['adder', 10, false],
    ]);
  });

  it('requires an integer roll for every spell', () => {
    expect(failure(() => EnchantmentScrRules.resolve(PLAN, { work: 10, weapon: 10, closed: 10 })).code).toBe(
      'err-enchantment-scr-roll-required',
    );
    expect(failure(() => EnchantmentScrRules.resolve(PLAN, { work: 10, weapon: 10, closed: 10.5, adder: 1 })).code).toBe(
      'err-enchantment-scr-roll-required',
    );
  });

  it('starts in progress without failures, and waits for the failure roll of a failed SCR', () => {
    expect(start().status).toBe('in-progress');
    const project = start({ work: 30, weapon: 40, closed: -20, adder: 20 });
    expect(project.status).toBe('pending-failures');
    // The negative modifiers of the closed list: -3 and -5
    expect(project.getProps().scr[2]).toMatchObject({ failed: true, total: -20, failureModifier: 8, failureRoll: null });
    expect(failure(() => project.progress(1)).code).toBe('err-enchantment-failure-rolls-pending');
    expect(failure(() => project.complete()).code).toBe('err-enchantment-failure-rolls-pending');
  });

  it('looks the failure roll plus the modifier up in the table of the spell, with its serendipity', () => {
    const project = start({ work: 30, weapon: 40, closed: -20, adder: 20 });
    expect(failure(() => project.applyFailureRolls({ weapon: 40 }, lookup)).code).toBe('err-enchantment-spell-unknown');
    project.applyFailureRolls({ closed: 58 }, lookup);
    expect(project.getProps().scr[2]).toMatchObject({
      failureRoll: 58,
      failure: { table: 'general', min: 66, max: 66, text: 'Lucky', serendipity: 'minor' },
    });
    expect(project.status).toBe('in-progress');
    expect(failure(() => project.applyFailureRolls({ closed: 1 }, lookup)).code).toBe('err-enchantment-status');
  });

  it('finds the row of a result, the open last row and the first row below every row', () => {
    expect(findFailureRow(ROWS, 166)).toMatchObject({ serendipity: 'major' });
    expect(findFailureRow(ROWS, 400)).toMatchObject({ text: 'Ruined' });
    expect(findFailureRow(ROWS, -12)).toMatchObject({ text: 'Nothing happens' });
    expect(findFailureRow([], 10)).toBeNull();
  });
});

describe('enchantment project life (workspace spec 064)', () => {
  it('counts the days worked up to the days the project needs; suspended days do not count', () => {
    const project = start();
    project.progress(10);
    project.suspend();
    expect(failure(() => project.progress(1)).code).toBe('err-enchantment-status');
    expect(failure(() => project.suspend()).code).toBe('err-enchantment-status');
    project.resume();
    project.progress(30);
    expect(project.getProps().daysCompleted).toBe(14);
    expect(failure(() => project.progress(0)).code).toBe('validation');
  });

  it('completes only when every day is worked, extra days included', () => {
    const project = start();
    project.progress(14);
    project.adjust({ extraDays: 2 });
    expect(failure(() => project.complete()).code).toBe('err-enchantment-not-finished');
    project.progress(5);
    project.complete();
    expect(project.status).toBe('completed');
    expect(project.getProps().completedAt).toBeInstanceOf(Date);
    expect(failure(() => project.cancel(0, null)).code).toBe('err-enchantment-status');
    expect(() => project.checkDeletable()).not.toThrow();
  });

  it('takes the extra cost and days as new totals: charges a rise, gives back a cut', () => {
    const project = start();
    expect(project.adjust({ extraCost: 3.5, notes: '  slow reagents ' })).toBe(3.5);
    project.recordPayment(3.5, 'entry-2');
    expect(project.adjust({ extraCost: 2 })).toBe(-1.5);
    project.recordPayment(-1.5, 'entry-3');
    expect(project.getProps()).toMatchObject({
      extraCost: 2,
      notes: 'slow reagents',
      paid: 10.5,
      refunded: 1.5,
      ledgerEntryIds: ['entry-1', 'entry-2', 'entry-3'],
    });
    expect(project.adjust({ extraCost: 2 })).toBe(0);
    // Extra days are a total too, and the days worked never go beyond the new total
    project.adjust({ extraDays: 4 });
    project.progress(18);
    project.adjust({ extraDays: 1 });
    expect(project.getProps()).toMatchObject({ extraDays: 1, daysCompleted: 15 });
    expect(failure(() => project.adjust({ extraDays: -1 })).code).toBe('validation');
  });

  it('refunds on a cancel from the net gold paid, adding to what was given back', () => {
    const project = start();
    project.adjust({ extraCost: 7 });
    project.recordPayment(7, null);
    project.adjust({ extraCost: 0 });
    project.recordPayment(-7, null);
    // 7 net, nothing worked
    expect(project.refundAmount()).toBe(7);
    project.cancel(7, null);
    expect(project.getProps()).toMatchObject({ paid: 14, refunded: 14 });
  });

  it('accepts open-ended failure rolls above 100', () => {
    const project = start({ work: 30, weapon: 40, closed: -20, adder: 20 });
    project.applyFailureRolls({ closed: 158 }, lookup);
    expect(project.getProps().scr[2]).toMatchObject({ failureRoll: 158, failure: { text: 'Very lucky', serendipity: 'major' } });
  });

  it('refunds the share of the gold paid for the days not worked', () => {
    const project = start();
    expect(project.refundAmount()).toBe(7);
    project.progress(4);
    // 7 × 10 / 14
    expect(project.refundAmount()).toBe(5);
    project.adjust({ extraDays: 6 });
    // 7 × 16 / 20
    expect(project.refundAmount()).toBe(5.6);
    expect(failure(() => project.checkDeletable()).code).toBe('err-enchantment-status');
    project.cancel(5.6, 'entry-3');
    expect(project.getProps()).toMatchObject({ status: 'cancelled', refunded: 5.6, ledgerEntryIds: ['entry-1', 'entry-3'] });
  });

  it('cancels a project waiting for its failure rolls', () => {
    const project = start({ work: -50, weapon: 40, closed: 30, adder: 20 });
    expect(project.refundAmount()).toBe(7);
    project.cancel(7, null);
    expect(project.status).toBe('cancelled');
  });
});

describe('enchanted item (workspace spec 064, decisions 6 and 7)', () => {
  const completedAt = new Date('2026-11-01T10:00:00.000Z');

  it('adds the bonuses over the material, the skill as a condition, the properties and the item level', () => {
    const project = start();
    const outcome = EnchantmentOutcomes.resolve(project.getProps(), { materialBonus: 10, materialTarget: 'attack' }, completedAt);
    const attack = outcome.modifiers.find(m => m.appliesTo === 'attack')!;
    expect(attack).toMatchObject({
      type: 'enchantment',
      value: 5,
      description: 'Spell weapon (+15)',
      source: { kind: 'enchantment', projectId: project.id },
    });
    const skill = outcome.modifiers.find(m => m.appliesTo === 'maneuver')!;
    expect(skill).toMatchObject({ value: 10, condition: 'Spell closed' });
    expect(outcome.modifiers.find(m => m.appliesTo === 'breakage')).toMatchObject({
      type: 'enchantment',
      value: 5,
      description: ITEM_LEVEL_DESCRIPTION,
    });
    expect(outcome.enchantment).toMatchObject({
      projectId: project.id,
      itemLevel: 5,
      alchemistId: 'alchemist-1',
      properties: [
        { kind: 'skill', value: 10, target: null },
        { kind: 'spell-adder', value: 1 },
      ],
      completedAt: completedAt.toISOString(),
    });
    expect(outcome.enchantment.spells.map(s => s.level)).toEqual([5, 4, 3, 2]);
    expect(outcome.unitValue).toBe(11.8);
    // The skill bonus is shown, not added; the item level is not breakage damage
    expect(ItemModifiers.bonus(outcome.modifiers, 'maneuver')).toBe(0);
    expect(ItemModifiers.bonus(outcome.modifiers, 'attack')).toBe(5);
    expect(ItemModifiers.condition(outcome.modifiers)).toEqual({ breakagePenalty: 0, broken: false });
  });

  it('adds nothing over a better material, and the whole bonus on another use', () => {
    const better = EnchantmentOutcomes.resolve(start().getProps(), { materialBonus: 20, materialTarget: 'attack' }, completedAt);
    expect(better.modifiers.find(m => m.appliesTo === 'attack')).toMatchObject({ value: 0, description: 'Spell weapon (+20)' });
    const other = EnchantmentOutcomes.resolve(start().getProps(), { materialBonus: 20, materialTarget: 'defense' }, completedAt);
    expect(other.modifiers.find(m => m.appliesTo === 'attack')).toMatchObject({ value: 15 });
  });
});

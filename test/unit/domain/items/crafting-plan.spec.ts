import { describe, expect, it } from 'vitest';
import { CraftingOutcomes } from '../../../../src/modules/items/domain/services/crafting-outcome.js';
import {
  armorWeightEffects,
  CraftingPlanner,
  type CraftingPlanInput,
  type PlanItemType,
  type PlanMaterial,
} from '../../../../src/modules/items/domain/services/crafting-plan.js';
import { ItemModifiers } from '../../../../src/modules/items/domain/value-objects/item-modifier.vo.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';

// Invented materials and item types, not the rulebook ones
const material = (id: string, values: Partial<PlanMaterial> = {}): PlanMaterial => ({
  id,
  durability: 0,
  workability: 0,
  bonus: 0,
  bluntBonus: null,
  metalBonus: null,
  cost: { add: 0, multiplier: null },
  magical: false,
  armorWeightMultiplier: null,
  uses: ['weapon', 'ammunition', 'armor', 'shield'],
  ...values,
});
const STEEL = material('steel', { durability: 3, workability: -8, bonus: 4, bluntBonus: 2, cost: { add: 2, multiplier: null } });
const PINE = material('pine', { durability: -5, workability: 10, bonus: -3, metalBonus: -9, cost: { add: null, multiplier: 0.5 } });
const LIGHT = material('light', { bonus: 6, armorWeightMultiplier: 0.5, uses: ['armor'] });
const YEW = material('yew', { bonus: 3, cost: { add: 1, multiplier: null }, uses: ['launcher'] });

const info = (average: number, productionHours: number | null = 10) => ({ cost: { average }, productionHours });
const SWORD: PlanItemType = { category: 'weapon', weapon: { skillId: 'melee-weapon@blade' }, armor: null, shield: null, info: info(10) };
const BOW: PlanItemType = { category: 'weapon', weapon: { skillId: 'ranged-weapon@bow' }, armor: null, shield: null, info: info(8) };
const ARROW: PlanItemType = { category: 'ammunition', weapon: null, armor: null, shield: null, info: info(0.1, 1) };
const TORSO: PlanItemType = { category: 'armor', weapon: null, armor: { slot: 'body' }, shield: null, info: info(20) };
const HELMET: PlanItemType = { category: 'armor', weapon: null, armor: { slot: 'head' }, shield: null, info: info(4) };
const SHIELD: PlanItemType = { category: 'shield', weapon: null, armor: null, shield: { db: 20 }, info: info(5) };
const ROPE: PlanItemType = { category: 'tools', weapon: null, armor: null, shield: null, info: info(1, null) };

const plan = (input: Partial<CraftingPlanInput> & Pick<CraftingPlanInput, 'itemType'>) =>
  CraftingPlanner.plan({ amount: 1, quality: {}, material: null, materialsPercent: 50, ...input });
const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    return (e as ValidationError & { code?: string }).code;
  }
  return undefined;
};

describe('CraftingPlanner (workspace spec 043)', () => {
  it('derives the kind of the item from the catalog', () => {
    expect([SWORD, BOW, ARROW, TORSO, HELMET, SHIELD, ROPE].map(type => CraftingPlanner.kind(type))).toEqual([
      'weapon',
      'launcher',
      'ammunition',
      'torso-armor',
      'armor',
      'shield',
      'other',
    ]);
  });

  it('keeps the plain craft of spec 023 when there is no quality', () => {
    expect(plan({ itemType: SWORD })).toMatchObject({
      kind: 'weapon',
      material: null,
      modifiers: [],
      productionHours: 10,
      workshop: 'basic',
      weightMultiplier: 1,
      cost: { unitBase: 10, unitMaterial: 0, unitPrice: 10, materials: 5, enhancements: 0, total: 5, asked: false },
    });
  });

  it('adds the material: cost, workability, hours and the bonus of a blunt weapon', () => {
    const result = plan({ itemType: SWORD, amount: 2, quality: { materialId: 'steel', blunt: true }, material: STEEL });
    expect(result.material).toEqual({ id: 'steel', bonus: 2, durability: 3, workability: -8, magical: false });
    expect(result.modifiers).toEqual([{ key: 'material-workability', value: -8 }]);
    // 10 hours each, 8% longer
    expect(result.productionHours).toBe(21.6);
    // (50% of 10 + 2) x 2
    expect(result.cost).toMatchObject({ unitBase: 10, unitMaterial: 2, unitPrice: 12, materials: 14 });
  });

  it('multiplies the base price for soft woods and gives the bonus in place of metal', () => {
    const result = plan({ itemType: SWORD, quality: { replacesMetal: true }, material: PINE });
    expect(result.material?.bonus).toBe(-9);
    expect(result.cost).toMatchObject({ unitBase: 5, unitMaterial: 0, materials: 2.5 });
    expect(result.productionHours).toBe(9);
  });

  it('pays the material of the missiles for 20 of them', () => {
    expect(plan({ itemType: ARROW, amount: 20, material: STEEL }).cost).toMatchObject({ unitMaterial: 0.1, materials: 3 });
  });

  it('makes a torso armor heavier or lighter, with the weight of its material', () => {
    expect(armorWeightEffects(-10)).toEqual({ db: -10, modifier: -10, costPercent: 10 });
    expect(armorWeightEffects(30)).toEqual({ db: 15, modifier: -15, costPercent: 30 });
    const result = plan({ itemType: TORSO, quality: { weightPercent: 20 }, material: LIGHT });
    expect(result).toMatchObject({ kind: 'torso-armor', bonusTarget: 'defense', weightDb: 10, weightPercent: 20 });
    expect(result.weightMultiplier).toBeCloseTo(0.6);
    expect(result.modifiers).toEqual([{ key: 'armor-weight', value: -10 }]);
    // 20 + 20%
    expect(result.cost.unitBase).toBe(24);
  });

  it('adds the masterwork and workshop modifiers', () => {
    expect(plan({ itemType: SWORD, quality: { masterwork: 'general', workshop: 'inferior' } }).modifiers).toEqual([
      { key: 'masterwork', value: -50 },
      { key: 'workshop', value: -20 },
    ]);
    expect(
      plan({ itemType: SHIELD, quality: { masterwork: 'circumstantial', circumstance: ' vs. arrows ', workshop: 'superior-15' } }),
    ).toMatchObject({
      modifiers: [
        { key: 'masterwork', value: -25 },
        { key: 'workshop', value: 15 },
      ],
      circumstance: 'vs. arrows',
    });
  });

  it('takes the materials cost typed by the game master and adds the enhancements', () => {
    expect(plan({ itemType: SWORD, material: STEEL, materialsCost: 3, enhancementsCost: 4 }).cost).toMatchObject({
      materials: 3,
      enhancements: 4,
      total: 7,
      asked: true,
    });
  });

  it('refuses what the rules do not allow', () => {
    expect(code(() => plan({ itemType: SWORD, material: YEW }))).toBe('err-crafting-material-not-allowed');
    expect(code(() => plan({ itemType: ROPE, material: STEEL }))).toBe('err-crafting-material-not-allowed');
    expect(code(() => plan({ itemType: HELMET, quality: { weightPercent: 10 } }))).toBe('err-crafting-invalid-weight');
    expect(code(() => plan({ itemType: TORSO, quality: { weightPercent: 15 } }))).toBe('err-crafting-invalid-weight');
    expect(code(() => plan({ itemType: HELMET, quality: { masterwork: 'general' } }))).toBe('err-crafting-masterwork-not-allowed');
    expect(code(() => plan({ itemType: SWORD, quality: { masterwork: 'circumstantial' } }))).toBe('err-crafting-circumstance-required');
    expect(code(() => plan({ itemType: SWORD, quality: { workshop: 'cave' as never } }))).toBe('err-crafting-invalid-workshop');
  });
});

describe('CraftingOutcomes with a plan (workspace spec 043)', () => {
  const rows = (modifiers: { appliesTo: string; value: number; description?: string; condition?: string }[]) =>
    modifiers.map(m => [m.appliesTo, m.value, m.description, m.condition]);

  it('gives the material, its durability and the masterwork of an absolute success', () => {
    const outcome = CraftingOutcomes.resolve(
      'absolute-success',
      [{ status: 'itemBreakage', value: 10 }],
      [],
      'e1',
      plan({ itemType: SWORD, quality: { masterwork: 'general' }, material: STEEL }),
    );
    expect(outcome.material).toEqual({ id: 'steel', bonus: 4, durability: 3, magical: false });
    expect(outcome.masterwork).toBe(true);
    expect(rows(outcome.modifiers)).toEqual([
      ['attack', 4, 'material', undefined],
      ['breakage', 3, 'material-durability', undefined],
      ['attack', 5, 'masterwork', undefined],
      ['breakage', 10, 'crafting-absolute-success', undefined],
    ]);
  });

  it('gives no masterwork below an absolute success, and nothing on a failure', () => {
    const masterwork = plan({ itemType: SWORD, quality: { masterwork: 'general' } });
    expect(CraftingOutcomes.resolve('success', [], [], 'e1', masterwork)).toMatchObject({
      crafted: true,
      modifiers: [],
      masterwork: false,
    });
    expect(CraftingOutcomes.resolve('failure', [], [], 'e1', masterwork)).toEqual({
      crafted: false,
      modifiers: [],
      material: null,
      masterwork: false,
    });
  });

  it('turns the launcher bonuses and a circumstantial masterwork into conditional modifiers', () => {
    const bow = CraftingOutcomes.resolve(
      'absolute-success',
      [],
      [],
      'e1',
      plan({ itemType: BOW, quality: { masterwork: 'general' }, material: YEW }),
    );
    expect(rows(bow.modifiers)).toEqual([
      ['all', 3, 'material', 'range-increment'],
      ['all', 5, 'masterwork', 'range-increment'],
    ]);
    const shield = CraftingOutcomes.resolve(
      'absolute-success',
      [],
      [],
      'e1',
      plan({ itemType: SHIELD, quality: { masterwork: 'circumstantial', circumstance: 'vs. arrows' } }),
    );
    expect(rows(shield.modifiers)).toEqual([['defense', 5, 'masterwork', 'vs. arrows']]);
    expect(ItemModifiers.bonus(shield.modifiers, 'defense')).toBe(0);
  });

  it('gives the DB of the armor weight and only the durability of a material to an armor piece', () => {
    const torso = CraftingOutcomes.resolve(
      'success',
      [],
      [],
      'e1',
      plan({ itemType: TORSO, quality: { weightPercent: -10 }, material: LIGHT }),
    );
    expect(rows(torso.modifiers)).toEqual([
      ['defense', 6, 'material', undefined],
      ['defense', -10, 'armor-weight', undefined],
    ]);
    const helmet = CraftingOutcomes.resolve('success', [], [], 'e1', plan({ itemType: HELMET, material: STEEL }));
    expect(rows(helmet.modifiers)).toEqual([['breakage', 3, 'material-durability', undefined]]);
  });

  it('summarizes the plan for the ledger', () => {
    const craft = plan({ itemType: SWORD, quality: { masterwork: 'general', workshop: 'superior-5' }, material: STEEL });
    const outcome = CraftingOutcomes.resolve('absolute-success', [], [], 'e1', craft);
    expect(CraftingOutcomes.summary(craft, outcome)).toMatchObject({
      kind: 'weapon',
      materialId: 'steel',
      materialBonus: 4,
      masterwork: 'general',
      masterworkAchieved: true,
      workshop: 'superior-5',
      cost: { total: 7 },
    });
  });
});

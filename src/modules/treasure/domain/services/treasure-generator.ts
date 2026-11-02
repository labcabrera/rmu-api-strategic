import type { ItemResponse } from '../../../items/application/ports/item-client.port.js';
import type { MagicItemRequest } from '../../../items/application/services/magic-items.service.js';
import { JEWELRY_CLASS_FACTORS, type JewelryClass } from '../../../items/domain/services/item-unit-value.js';
import type { MagicItemBonus } from '../../../items/domain/value-objects/item-catalog-info.vo.js';
import {
  findRow,
  type GenericMagicItem,
  type MagicTable,
  type MagicTableRow,
  type TreasureQuality,
  type TreasureTables,
} from '../../../items/domain/value-objects/treasure-tables.vo.js';
import type { Dice } from './dice.js';

/** Silver in a gold piece: the tables of 7.1 are in silver (decision 11), strategic stores gold. */
const SP_PER_GP = 10;
/** Totals of the magic tables 7-1i to 7-1q go from 1 to 300 (decision 10). */
const MAX_MAGIC_TOTAL = 300;
/** Rolls again an item above the level of its code at most this many times (decision 15). */
const MAX_LEVEL_REROLLS = 3;
/** A precious gem is worth this silver or more (decision 13). */
const PRECIOUS_GEM_SP = 10;

/** The generic catalog type of the art of a treasure (workspace spec 067, plan section 0). */
export const ART_OBJECT_TYPE = 'art-object';

const round2 = (value: number) => Math.round(value * 100) / 100;

/** One roll, shown to the game master (decision 10). */
export interface TreasureDie {
  table: string;
  roll: number;
  modifier: number;
  total: number;
  result: string;
}

export interface TreasureGoldLine {
  kind: 'gold';
  gold: number;
  dice: TreasureDie[];
}

export interface TreasureItemLine {
  kind: 'item';
  itemTypeId: string;
  name: string;
  amount: number | null;
  /** Gold of one unit. */
  value: number;
  carats?: number | null;
  jewelryClass?: JewelryClass | null;
  /** Size of a random weapon (7-1j), null for medium. */
  size?: string | null;
  magic?: MagicItemRequest | null;
  dice: TreasureDie[];
}

export interface TreasureNoteLine {
  kind: 'note';
  text: string;
  dice: TreasureDie[];
}

export type TreasureLine = TreasureGoldLine | TreasureItemLine | TreasureNoteLine;

export interface TreasureCodes {
  wealth: TreasureQuality[];
  lifestyle: TreasureQuality[];
  magic: TreasureQuality[];
}

export interface TreasureRoll {
  codes: TreasureCodes;
  lines: TreasureLine[];
  warnings: string[];
}

/** What the generator reads outside the tables: the catalog of items and the spells of a list. */
export interface TreasureCatalog {
  itemType(itemTypeId: string): Promise<ItemResponse | undefined>;
  /** The spells of a level of the list with that code (empty when there are none). */
  spells(listCode: string, level: number): Promise<{ name: string; level: number }[]>;
}

export interface TreasureInput {
  codes: TreasureCodes;
  /** Sum of the modifiers of 7-1c. */
  wealthModifier: number;
  /** Notes of the codes that roll nothing (`special…`, `-`). */
  notes?: string[];
  warnings?: string[];
}

/** The codes of a book string (`"c, n, x"`): a repeated code rolls twice; `special…` and `-` roll nothing (decision 12). */
export function parseTreasureCodes(
  text: string | null | undefined,
  codes: TreasureTables['codes'],
): { codes: TreasureCodes; notes: string[]; warnings: string[] } {
  const result: TreasureCodes = { wealth: [], lifestyle: [], magic: [] };
  const notes: string[] = [];
  const warnings: string[] = [];
  const tokens = (text ?? '')
    .split(/[,;]+/)
    .map(token => token.trim().toLowerCase())
    .filter(Boolean)
    // "c n x" without commas: single letters separated by spaces
    .flatMap(token => (/^[a-z](\s+[a-z])+$/.test(token) ? token.split(/\s+/) : [token]));
  for (const token of tokens) {
    if (token === '-') {
      notes.push('treasure-no-treasure');
    } else if (token.startsWith('special')) {
      notes.push(token);
      warnings.push(`treasure-special-code: ${token}`);
    } else if (codes.wealth?.[token]) {
      result.wealth.push(codes.wealth[token]);
    } else if (codes.lifestyle?.[token]) {
      result.lifestyle.push(codes.lifestyle[token]);
    } else if (codes.magic?.[token]) {
      result.magic.push(codes.magic[token]);
    } else {
      warnings.push(`treasure-unknown-code: ${token}`);
    }
  }
  return { codes: result, notes, warnings };
}

/**
 * Random treasure of Treasure Law 7.1 (workspace spec 067, decisions 10-15): a pure service over the tables of core,
 * the catalog and injectable dice. Every roll is a closed d100 and goes with its line; nothing is stored.
 */
export class TreasureGenerator {
  private lines: TreasureLine[] = [];
  private warnings: string[] = [];

  constructor(
    private readonly tables: TreasureTables,
    private readonly catalog: TreasureCatalog,
    private readonly dice: Dice,
  ) {}

  async generate(input: TreasureInput): Promise<TreasureRoll> {
    this.lines = (input.notes ?? []).map(text => ({ kind: 'note', text, dice: [] }));
    this.warnings = [...(input.warnings ?? [])];
    for (const quality of input.codes.wealth) await this.wealth(quality, input.wealthModifier);
    for (const quality of input.codes.lifestyle) this.lifestyle(quality);
    for (const quality of input.codes.magic) await this.magic(quality);
    return { codes: input.codes, lines: this.lines, warnings: this.warnings };
  }

  private d100(table: string, modifier = 0, describe: (total: number) => string = total => String(total)): TreasureDie & { value: number } {
    const roll = this.dice.roll(1, 100);
    const total = roll + modifier;
    return { table, roll, modifier, total, result: describe(total), value: total };
  }

  private die(table: string, roll: number, modifier: number, total: number, result: string): TreasureDie {
    return { table, roll, modifier, total, result };
  }

  /** A number in a range, with its die when the range is not a single value. */
  private between(table: string, min: number, max: number, dice: TreasureDie[]): number {
    if (min >= max) return min;
    const value = this.dice.roll(min, max);
    dice.push(this.die(table, value, 0, value, String(value)));
    return value;
  }

  private unresolved(text: string, dice: TreasureDie[]): void {
    this.lines.push({ kind: 'note', text, dice });
    this.warnings.push(`treasure-unresolved: ${text}`);
  }

  // Decision 13: 7-1b rolls, 7-1c value and type, then coins, gems, jewelry or art
  private async wealth(quality: TreasureQuality, wealthModifier: number): Promise<void> {
    const first = this.d100('7-1b');
    const rolls = findRow(this.tables.wealthRolls, first.value);
    const header = this.die('7-1b', first.roll, 0, first.total, `${quality}: ${rolls?.rolls ?? 0}`);
    if (!rolls) return this.unresolved(`treasure-no-row: 7-1b ${first.total}`, [header]);
    for (let index = 0; index < rolls.rolls; index++) {
      const dice: TreasureDie[] = index === 0 ? [header] : [];
      const valueRoll = this.d100('7-1c', wealthModifier);
      const valueRow = findRow(this.tables.wealthValue, valueRoll.total);
      dice.push(
        this.die('7-1c', valueRoll.roll, wealthModifier, valueRoll.total, valueRow ? `${valueRow.valueMin}-${valueRow.valueMax}` : '-'),
      );
      if (!valueRow) {
        this.unresolved(`treasure-no-row: 7-1c ${valueRoll.total}`, dice);
        continue;
      }
      const base = this.between('7-1c-value', valueRow.valueMin, valueRow.valueMax, dice);
      const typeRoll = this.d100('7-1c-type');
      const typeRow = findRow(this.tables.wealthType, typeRoll.total);
      dice.push(this.die('7-1c-type', typeRoll.roll, 0, typeRoll.total, typeRow ? `${typeRow.type} x${typeRow.multiplier}` : '-'));
      if (!typeRow) {
        this.unresolved(`treasure-no-row: 7-1c-type ${typeRoll.total}`, dice);
        continue;
      }
      const silver = round2(base * typeRow.multiplier * (this.tables.wealthMultipliers?.[quality] ?? 1));
      const gold = round2(silver / SP_PER_GP);
      if (!(gold > 0)) {
        this.lines.push({ kind: 'note', text: 'treasure-no-value', dice });
        continue;
      }
      switch (typeRow.type) {
        case 'coins':
          this.lines.push({ kind: 'gold', gold, dice });
          break;
        case 'gems':
          await this.gem(silver, gold, dice);
          break;
        case 'jewelry':
          await this.jewel(gold, dice);
          break;
        case 'art':
          this.art(gold, dice);
          break;
      }
    }
  }

  /** 2-4d at 10 sp or more, else 2-4e; the column by the value; carats = value / price per carat (0.01). */
  private async gem(silver: number, gold: number, dice: TreasureDie[]): Promise<void> {
    const precious = silver >= PRECIOUS_GEM_SP;
    const table = precious ? this.tables.gems?.precious : this.tables.gems?.semiPrecious;
    const tableId = precious ? '2-4d' : '2-4e';
    const columns = table?.columns ?? [];
    const column =
      columns.find(candidate => silver >= candidate.min && silver <= candidate.max) ??
      (columns.length && silver < columns[0].min ? columns[0] : columns[columns.length - 1]);
    const roll = this.d100(tableId);
    const row = findRow(column?.rows, roll.total);
    dice.push(this.die(tableId, roll.roll, 0, roll.total, row?.itemTypeId ?? '-'));
    const type = row ? await this.catalog.itemType(row.itemTypeId) : undefined;
    const perCarat = type?.features?.gem?.valuePerCarat;
    if (!row || !type || !perCarat) return this.unresolved(`treasure-gem-unresolved: ${row?.itemTypeId ?? tableId}`, dice);
    const carats = Math.max(0.01, round2(gold / perCarat));
    this.lines.push({ kind: 'item', itemTypeId: type.id, name: type.name ?? type.id, amount: null, value: gold, carats, dice });
  }

  /** 7-1d; the class of highest factor that leaves the base value in the range of the type, or Quality. */
  private async jewel(gold: number, dice: TreasureDie[]): Promise<void> {
    const roll = this.d100('7-1d');
    const row = findRow(this.tables.jewelryTypes, roll.total);
    dice.push(this.die('7-1d', roll.roll, 0, roll.total, row?.itemTypeId ?? '-'));
    const type = row ? await this.catalog.itemType(row.itemTypeId) : undefined;
    if (!row || !type) return this.unresolved(`treasure-jewel-unresolved: ${row?.itemTypeId ?? '7-1d'}`, dice);
    this.lines.push({
      kind: 'item',
      itemTypeId: type.id,
      name: type.name ?? type.id,
      amount: null,
      value: gold,
      jewelryClass: TreasureGenerator.jewelryClass(gold, type.features?.jewelry?.value ?? null),
      dice,
    });
  }

  static jewelryClass(gold: number, range: { min: number; max: number } | null): JewelryClass {
    if (range) {
      const classes = (Object.entries(JEWELRY_CLASS_FACTORS) as [JewelryClass, number][]).sort((a, b) => b[1] - a[1]);
      for (const [jewelryClass, factor] of classes) {
        const base = gold / factor;
        if (base >= Math.min(range.min, range.max) && base <= Math.max(range.min, range.max)) return jewelryClass;
      }
    }
    return 'quality';
  }

  /** 7-1e: a generic art object named by its type. */
  private art(gold: number, dice: TreasureDie[]): void {
    const roll = this.d100('7-1e');
    const row = findRow(this.tables.artTypes, roll.total);
    dice.push(this.die('7-1e', roll.roll, 0, roll.total, row?.key ?? '-'));
    if (!row) return this.unresolved('treasure-no-row: 7-1e', dice);
    this.lines.push({ kind: 'item', itemTypeId: ART_OBJECT_TYPE, name: row.key, amount: null, value: gold, dice });
  }

  // Decision 14: the quality of the gear is a note for the game master
  private lifestyle(quality: TreasureQuality): void {
    const roll = this.d100('7-1f');
    const row = findRow(this.tables.gearQuality, roll.total);
    const gear = row?.[quality];
    const result = gear ? `+${gear.total} / max ${gear.max === null ? '-' : `+${gear.max}`}` : '-';
    const dice = [this.die('7-1f', roll.roll, 0, roll.total, result)];
    if (!gear) return this.unresolved('treasure-no-row: 7-1f', dice);
    this.lines.push({ kind: 'note', text: `treasure-lifestyle: ${quality} ${result}`, dice });
  }

  // Decision 15: 7-1g gives the modifiers, one item each
  private async magic(quality: TreasureQuality): Promise<void> {
    const roll = this.d100('7-1g');
    const row = findRow(this.tables.magicTreasure, roll.total);
    const modifiers = row?.[quality] ?? [];
    const header = this.die('7-1g', roll.roll, 0, roll.total, modifiers.length ? modifiers.join(', ') : 'treasure-no-magic');
    if (modifiers.length === 0) {
      this.lines.push({ kind: 'note', text: 'treasure-no-magic', dice: [header] });
      return;
    }
    for (const [index, modifier] of modifiers.entries()) {
      await this.magicItem(quality, modifier, index === 0 ? [header] : []);
    }
  }

  private async magicItem(quality: TreasureQuality, modifier: number, dice: TreasureDie[]): Promise<void> {
    const cap = this.tables.magicMaxLevel?.[quality] ?? null;
    for (let attempt = 0; ; attempt++) {
      const typeRoll = this.d100('7-1h');
      const typeRow = findRow(this.tables.itemType, typeRoll.total);
      dice.push(this.die('7-1h', typeRoll.roll, 0, typeRoll.total, typeRow?.table ?? '-'));
      if (!typeRow) return this.unresolved('treasure-no-row: 7-1h', dice);
      const table: MagicTable = typeRow.table;
      const itemRoll = this.dice.roll(1, 100);
      const raw = itemRoll + modifier;
      if (raw < 1) {
        dice.push(this.die(`magic-${table}`, itemRoll, modifier, raw, 'treasure-no-item'));
        this.lines.push({ kind: 'note', text: 'treasure-no-item', dice });
        return;
      }
      const total = Math.min(raw, MAX_MAGIC_TOTAL);
      const row = findRow(this.tables.magicTables?.[table], total);
      dice.push(this.die(`magic-${table}`, itemRoll, modifier, total, row?.label ?? '-'));
      if (!row) return this.unresolved(`treasure-no-row: magic-${table} ${total}`, dice);
      const resolved = await this.resolve(row, dice);
      if (!resolved) return;
      if (cap !== null && resolved.level > cap) {
        if (attempt < MAX_LEVEL_REROLLS) continue;
        this.warnings.push(`treasure-level-above-max: ${resolved.line.name} ${resolved.level} > ${cap}`);
      }
      this.lines.push(resolved.line);
      return;
    }
  }

  /** A named item of the compendium, or a generic one; null when it could not be resolved (already a note). */
  private async resolve(row: MagicTableRow, dice: TreasureDie[]): Promise<{ line: TreasureItemLine; level: number } | null> {
    if (row.itemTypeId) {
      const type = await this.catalog.itemType(row.itemTypeId);
      if (!type) {
        this.unresolved(row.label, dice);
        return null;
      }
      const magic = type.features?.magic;
      const value = magic?.standardPrice ?? round2(this.between('magic-price', row.price.min, row.price.max, dice) / SP_PER_GP);
      const line: TreasureItemLine = {
        kind: 'item',
        itemTypeId: type.id,
        name: type.name ?? row.label,
        amount: type.info.stackable ? 1 : null,
        value,
        magic: null,
        dice,
      };
      return { line, level: magic?.itemLevel ?? 0 };
    }
    if (row.generic) return this.generic(row, row.generic, dice);
    this.unresolved(row.label, dice);
    return null;
  }

  private async generic(
    row: MagicTableRow,
    generic: GenericMagicItem,
    dice: TreasureDie[],
  ): Promise<{ line: TreasureItemLine; level: number } | null> {
    let itemTypeId = generic.baseItemTypeId ?? null;
    let missile = generic.base === 'missile';
    let size: string | null = null;
    if (!itemTypeId && (generic.base === 'weapon' || generic.base === 'missile' || generic.base === 'ranged')) {
      const weapon = this.randomWeapon(generic.base, dice);
      itemTypeId = weapon.itemTypeId;
      missile = missile || weapon.missile;
      size = weapon.size;
    } else if (!itemTypeId && generic.base === 'armor') {
      const roll = this.d100('7-1n');
      const armor = findRow(this.tables.randomArmor, roll.total);
      dice.push(this.die('7-1n', roll.roll, 0, roll.total, armor?.itemTypeId ?? '-'));
      itemTypeId = armor?.itemTypeId ?? null;
    } else if (!itemTypeId && generic.base === 'shield') {
      itemTypeId = (this.tables.randomArmor ?? []).find(armor => armor.shield && armor.itemTypeId)?.itemTypeId ?? null;
    }
    const type = itemTypeId ? await this.catalog.itemType(itemTypeId) : undefined;
    if (!type) {
      this.unresolved(row.label, dice);
      return null;
    }

    const bonuses: MagicItemBonus[] = (generic.bonuses ?? []).map(bonus => {
      if (bonus.against !== 'random') return { ...bonus, target: bonus.target ?? null, against: bonus.against ?? null };
      const roll = this.d100('7-1k');
      const creature = findRow(this.tables.creatureTypes, roll.total);
      dice.push(this.die('7-1k', roll.roll, 0, roll.total, creature ? `treasure-creature-${creature.key}` : '-'));
      return { ...bonus, target: bonus.target ?? null, against: creature?.key ?? null };
    });

    let spell: { name: string; level: number; list: string } | null = null;
    if (generic.spell) {
      spell = await this.randomSpell(generic.spell, dice);
      if (!spell) {
        this.unresolved(row.label, dice);
        return null;
      }
    }

    let amount: number | null = type.info.stackable ? 1 : null;
    if (missile) {
      const first = this.dice.roll(1, 10);
      const second = this.dice.roll(1, 10);
      dice.push(this.die('2d10', first + second, 0, first + second, `${first} + ${second}`));
      if (type.info.stackable) amount = first + second;
      else this.warnings.push(`treasure-missiles-not-stackable: ${type.id}`);
    }
    const value = round2(this.between('magic-price', row.price.min, row.price.max, dice) / SP_PER_GP);
    const level = generic.itemLevel ?? spell?.level ?? 0;
    const magic: MagicItemRequest = {
      baseItemTypeId: type.id,
      name: null,
      kind: generic.kind,
      itemLevel: level,
      bonuses,
      spells:
        spell && generic.spell
          ? [{ name: spell.name, level: spell.level, list: spell.list, use: generic.spell.use, perDay: generic.spell.perDay ?? null }]
          : [],
      charges: generic.spell?.charges ?? null,
      attunement: false,
      price: value,
      standard: null,
    };
    const line: TreasureItemLine = { kind: 'item', itemTypeId: type.id, name: row.label, amount, value, magic, dice };
    if (size) line.size = size;
    return { line, level };
  }

  /** 7-1j: the sub-table (or the missile/ranged group when the tables have it), the weapon and its size. */
  private randomWeapon(
    base: 'weapon' | 'missile' | 'ranged',
    dice: TreasureDie[],
  ): { itemTypeId: string | null; missile: boolean; size: string | null } {
    const weapons = this.tables.randomWeapons;
    // A missile or ranged base rolls in its own group when the tables have one (`launcher` for a ranged weapon)
    const own = base === 'missile' ? ['missile'] : base === 'ranged' ? ['ranged', 'launcher'] : [];
    let group: string | undefined = own.find(key => weapons?.groups?.[key]);
    if (!group) {
      const roll = this.d100('7-1j');
      group = findRow(weapons?.table, roll.total)?.group;
      dice.push(this.die('7-1j', roll.roll, 0, roll.total, group ?? '-'));
    }
    const roll = this.d100(`7-1j-${group ?? '-'}`);
    const row = group ? findRow(weapons?.groups?.[group], roll.total) : undefined;
    dice.push(this.die(`7-1j-${group ?? '-'}`, roll.roll, 0, roll.total, row?.itemTypeId ?? '-'));
    const sizeRoll = this.d100('7-1j-size');
    const size = findRow(weapons?.size, sizeRoll.total)?.size ?? null;
    dice.push(this.die('7-1j-size', sizeRoll.roll, 0, sizeRoll.total, size ?? 'medium'));
    return { itemTypeId: row?.itemTypeId ?? null, missile: !!row?.missile, size: size && size !== 'medium' ? size : null };
  }

  /**
   * 7-1r: the realm (rolled, or among the realms of the row), the list (rolled, or the one of the row) and a spell of
   * that level of the list in rmu-api-spells; a row that names its spells picks one of those names instead.
   */
  private async randomSpell(
    spec: NonNullable<GenericMagicItem['spell']>,
    dice: TreasureDie[],
  ): Promise<{ name: string; level: number; list: string } | null> {
    const level = this.between('spell-level', spec.levelMin, spec.levelMax, dice);
    let listCode = spec.listCode ?? null;
    if (!listCode) {
      let realm: string | undefined;
      if (spec.realms?.length) {
        realm = spec.realms.length === 1 ? spec.realms[0] : spec.realms[this.dice.roll(1, spec.realms.length) - 1];
        dice.push(this.die('realm', 0, 0, 0, realm));
      } else {
        const realmRoll = this.d100('7-1r');
        realm = findRow(this.tables.randomSpells?.realm, realmRoll.total)?.realm;
        dice.push(this.die('7-1r', realmRoll.roll, 0, realmRoll.total, realm ?? '-'));
      }
      if (!realm) return null;
      const listRoll = this.d100(`7-1r-${realm}`);
      listCode = findRow(this.tables.randomSpells?.lists?.[realm], listRoll.total)?.listCode ?? null;
      dice.push(this.die(`7-1r-${realm}`, listRoll.roll, 0, listRoll.total, listCode ?? 'treasure-other-list'));
      if (!listCode) return null;
    }
    if (spec.names?.length) {
      const pick = spec.names.length === 1 ? 1 : this.dice.roll(1, spec.names.length);
      if (spec.names.length > 1) dice.push(this.die('spell', pick, 0, pick, spec.names[pick - 1]));
      return { name: spec.names[pick - 1], level, list: listCode };
    }
    const spells = await this.catalog.spells(listCode, level);
    if (spells.length === 0) return null;
    const pick = spells.length === 1 ? 1 : this.dice.roll(1, spells.length);
    if (spells.length > 1) dice.push(this.die('spell', pick, 0, pick, spells[pick - 1].name));
    return { name: spells[pick - 1].name, level, list: listCode };
  }
}

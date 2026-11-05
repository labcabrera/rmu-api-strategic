import type { CharacterAccess } from '../../../../../src/modules/characters/application/services/character-access.service.js';
import type { CharacterWriter } from '../../../../../src/modules/characters/application/services/character-writer.service.js';
import { EquipItemCommand } from '../../../../../src/modules/characters/application/cqrs/commands/equip-item.command.js';
import { EquipItemHandler } from '../../../../../src/modules/characters/application/cqrs/handlers/equip-item.handler.js';
import type { CharacterRepository } from '../../../../../src/modules/characters/application/ports/character-repository.port.js';
import { Character } from '../../../../../src/modules/characters/domain/aggregates/character.js';
import type { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service.js';
import { EquipmentProcessor } from '../../../../../src/modules/characters/domain/services/character/processors/equipment-processor.js';
import type { ItemRepository } from '../../../../../src/modules/items/application/ports/item-repository.port.js';
import { Item } from '../../../../../src/modules/items/domain/aggregates/item.js';
import type { ItemModifier } from '../../../../../src/modules/items/domain/value-objects/item-modifier.vo.js';
import { fakeEventPublisher } from '../../../support/fake-event-publisher.js';
import { buildCharacter } from '../traits/character.fixture.js';

// Workspace spec 077, block B1: the load counts what is worn. Invented items; the §5.4 example only as numbers.

const gear = (id: string, weight: number, carried = true): Item =>
  ({
    id,
    itemTypeId: 'gear',
    info: { weight },
    units: 1,
    carried,
    weapon: null,
    shield: null,
    armor: null,
    modifiers: [],
  }) as unknown as Item;

const piece = (
  id: string,
  props: { weight: number; enc: number; slot?: string; fittedWeight?: number; carried?: boolean; modifiers?: ItemModifier[] },
): Item =>
  ({
    id,
    itemTypeId: 'armor',
    info: { weight: props.weight },
    units: 1,
    carried: props.carried ?? false,
    weapon: null,
    shield: null,
    modifiers: props.modifiers ?? [],
    armor: {
      slot: props.slot ?? 'body',
      at: 8,
      enc: props.enc,
      maneuverPenalty: 0,
      rangedPenalty: 0,
      perceptionPenalty: 0,
      baseDifficulty: 'e',
      ...(props.fittedWeight ? { fittedWeight: props.fittedWeight } : {}),
    },
  }) as unknown as Item;

const breakage = (value: number): ItemModifier => ({
  id: `breakage-${value}`,
  type: 'breakage',
  value,
  appliesTo: 'all',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const character = (weight: number, st: number, slots: Record<string, string | null> = {}): Character => {
  const built = buildCharacter({ slots });
  built.info.weight = weight;
  built.statistics.st.totalBonus = st;
  return built;
};

describe('equipment processor: load (spec 077, B1)', () => {
  const processor = new EquipmentProcessor();

  it('counts the worn armor in the load: 220 lb, St +3, 75 lb in all is 34 % and -13 (§5.4)', () => {
    const sheet = character(220, 3, { body: 'armor-1' });
    processor.process(sheet, [piece('armor-1', { weight: 45, enc: 20, fittedWeight: 220 }), gear('pack', 30)]);
    expect(sheet.equipment.load).toEqual({ worn: 45, carried: 30, percent: 34 });
    expect(sheet.equipment.weight).toBe(75);
    expect(sheet.equipment.encumbrancePenalty).toBe(-13);
    expect(sheet.equipment.armorEncumbrance).toBe(20);
  });

  it('counts an equipped item that is not marked as carried', () => {
    const sheet = character(220, 3, { mainHand: 'blade' });
    processor.process(sheet, [gear('blade', 5, false), gear('loose', 3, false)]);
    expect(sheet.equipment.load).toEqual({ worn: 5, carried: 0, percent: 2 });
  });

  it('keeps the Enc % of the armor apart from the load penalty, and counts a full suit once', () => {
    const sheet = character(200, 0, { body: 'suit', head: 'suit', arms: 'suit', legs: 'suit' });
    processor.process(sheet, [piece('suit', { weight: 10, enc: 25, fittedWeight: 200 })]);
    expect(sheet.equipment.armorEncumbrance).toBe(25);
    expect(sheet.equipment.load?.worn).toBe(10);
    expect(sheet.equipment.encumbrancePenalty).toBe(0);
  });

  it('leaves out of the Enc % a piece that no longer protects (beyond -50)', () => {
    const sheet = character(200, 0, { body: 'chest', head: 'helm' });
    processor.process(sheet, [
      piece('chest', { weight: 20, enc: 15, fittedWeight: 200 }),
      piece('helm', { weight: 2, enc: 3, slot: 'head', fittedWeight: 200, modifiers: [breakage(-55)] }),
    ]);
    expect(sheet.equipment.armorEncumbrance).toBe(15);
    expect(sheet.equipment.load?.worn).toBe(22);
  });

  it('scales an armor made for 185 lb worn by a 220 lb body (×220/185)', () => {
    const sheet = character(220, 0, { body: 'old' });
    processor.process(sheet, [piece('old', { weight: 37, enc: 20, fittedWeight: 185 })]);
    expect(sheet.equipment.load?.worn).toBe(44);
  });

  it('takes 185 lb for an armor without fittedWeight, and does not scale a carried one', () => {
    const sheet = character(370, 0);
    processor.process(sheet, [piece('spare', { weight: 37, enc: 20, carried: true })]);
    expect(sheet.equipment.load).toEqual({ worn: 0, carried: 37, percent: 10 });
    const worn = character(370, 0, { body: 'legacy' });
    processor.process(worn, [piece('legacy', { weight: 37, enc: 20 })]);
    expect(worn.equipment.load?.worn).toBe(74);
  });

  it('never lowers the allowance below 0 nor gives a bonus', () => {
    const sheet = character(100, -10);
    processor.process(sheet, [gear('pack', 10)]);
    expect(sheet.equipment.weightAllowance).toBe(0);
    expect(sheet.equipment.encumbrancePenalty).toBe(-10);
    const light = character(100, 5);
    processor.process(light, [gear('pack', 10)]);
    expect(light.equipment.encumbrancePenalty).toBe(0);
  });

  it('gives a load of 0 with a body weight of 0', () => {
    const sheet = character(0, 0, { body: 'armor-1' });
    processor.process(sheet, [piece('armor-1', { weight: 20, enc: 10, fittedWeight: 185 }), gear('pack', 30)]);
    expect(sheet.equipment.load).toEqual({ worn: 20, carried: 30, percent: 0 });
    expect(sheet.equipment.encumbrancePenalty).toBe(0);
    expect(Number.isFinite(sheet.equipment.weightAllowance)).toBe(true);
  });
});

describe('equip-item (spec 077, B1.1)', () => {
  it('gives the same load right after equipping as a later recalculation', async () => {
    const sheet = character(220, 3);
    const armorItem = Item.fromProps({
      ...(piece('armor-1', { weight: 45, enc: 20, fittedWeight: 220 }) as unknown as Record<string, unknown>),
      gameId: 'game-001',
      characterId: sheet.id,
      factionId: null,
      name: 'Invented armor',
      category: 'armor',
      amount: null,
      info: { length: null, weight: 45, strength: null, stackable: false },
      owner: 'user-001',
      createdAt: new Date(),
    } as never);
    const items = [armorItem, gear('pack', 30)];
    const processor = new EquipmentProcessor();
    const processorService = { process: (c: Character, i: Item[]) => processor.process(c, i) } as unknown as CharacterProcessorService;
    const updateCarriedStatus = vi.fn((id: string, carried: boolean) => {
      const item = items.find(i => i.id === id)!;
      return Promise.resolve(Object.assign(item, { carried }));
    });
    const handler = new EquipItemHandler(
      { findById: () => Promise.resolve(sheet) } as unknown as CharacterRepository,
      { findByCharacterId: () => Promise.resolve(items), updateCarriedStatus } as unknown as ItemRepository,
      processorService,
      { checkChange: () => Promise.resolve() } as unknown as CharacterAccess,
      { save: (c: Character) => Promise.resolve(c) } as unknown as CharacterWriter,
      fakeEventPublisher().publisher,
    );
    const saved = await handler.execute(new EquipItemCommand(sheet.id, 'armor-1', 'body', 'user-001', ['rmu-user']));
    expect(saved.equipment.load).toEqual({ worn: 45, carried: 30, percent: 34 });
    expect(saved.equipment.encumbrancePenalty).toBe(-13);
    expect(updateCarriedStatus).toHaveBeenCalledWith('armor-1', true);
    const again = character(220, 3, { body: 'armor-1' });
    processor.process(again, items);
    expect(again.equipment.load).toEqual(saved.equipment.load);
  });
});

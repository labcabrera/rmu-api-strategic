import { readFileSync } from 'fs';
import { join } from 'path';
import type { FactionFile } from '../../../../src/modules/exports/domain/format/export-format.js';
import { planImport } from '../../../../src/modules/exports/domain/import/import-planner.js';
import { NamedEntity } from '../../../../src/modules/shared/domain/entities/named-entity.js';

const faction = () =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../../fixtures/exports/v4/faction.rmu.json'), 'utf8')) as FactionFile;

describe('import planner (spec 024, decision 5)', () => {
  const target = (overrides: Partial<Parameters<typeof planImport>[2]> = {}) => ({
    gameId: 'game-new',
    faction: new NamedEntity('faction-new', 'Realm'),
    owner: 'importer',
    importId: 'import-1',
    missingSkills: new Set<string>(),
    skillCategories: new Map<string, string>(),
    missingTraits: new Set<string>(),
    characterNames: new Map<string, string>(),
    ...overrides,
  });

  it('creates new ids and translates slots, holders and crafters, owned by the importer and tagged with the import', () => {
    const file = faction();
    const plan = planImport(
      file.data.characters,
      file.data.armory,
      target({ characterNames: new Map(file.data.characters.map(e => [e.ref, e.character.name])) }),
    );
    const smith = plan.characters[0].character;
    expect(plan.characters).toHaveLength(3);
    expect(new Set(plan.characters.map(p => p.character.id)).size).toBe(3);
    for (const { character, items } of plan.characters) {
      expect(character).toMatchObject({ gameId: 'game-new', owner: 'importer', importId: 'import-1', faction: { id: 'faction-new' } });
      for (const item of items)
        expect(item).toMatchObject({ characterId: character.id, factionId: null, owner: 'importer', importId: 'import-1' });
      for (const itemId of Object.values(character.equipment.slots).filter(Boolean)) {
        expect(items.map(item => item.id)).toContain(itemId);
      }
    }
    const blade = plan.armory.find(item => item.name === 'Realm blade')!;
    expect(blade).toMatchObject({ factionId: 'faction-new', characterId: null });
    expect(blade.modifiers.find(m => m.source?.kind === 'crafting')!.source).toMatchObject({ crafterId: smith.id, crafterName: 'Smith' });
    expect(blade.getUncommittedEvents()).toHaveLength(1);
  });

  it('keeps only the name of a crafter that is not imported, and marks the skills and traits the catalog lacks', () => {
    const file = faction();
    const soldier = file.data.characters.find(entry => entry.character.name === 'Soldier')!;
    soldier.items[0].modifiers.push({
      id: 'x',
      type: 'quality',
      value: 1,
      appliesTo: 'all',
      source: { kind: 'crafting', crafterRef: 'c1' },
      createdAt: 'x',
    });
    soldier.character.traits.push({
      traitId: 'lost',
      traitName: 'Lost',
      isTalent: true,
      tier: 1,
      cost: 0,
      specialization: null,
      paidWith: null,
    });
    const plan = planImport(
      [soldier],
      [],
      target({ characterNames: new Map([['c1', 'Smith']]), missingSkills: new Set(['perception']), missingTraits: new Set(['lost']) }),
    );
    const [{ character, items }] = plan.characters;
    expect(items[0].modifiers.at(-1)!.source).toEqual({ kind: 'crafting', crafterName: 'Smith' });
    expect(character.skills.find(s => s.skillId === 'perception')!.missingReference).toBe(true);
    expect(character.skills.find(s => s.skillId === 'body-development')!.missingReference).toBeUndefined();
    expect(character.traits.find(t => t.traitId === 'lost')!.missingReference).toBe(true);
  });

  // Spec 044, decision 4: the export format has no category; the destination catalog gives it
  it('sets the category of each skill from the catalog map, and none for a skill the catalog lacks', () => {
    const file = faction();
    const soldier = file.data.characters.find(entry => entry.character.name === 'Soldier')!;
    const skillIds = soldier.character.skills.map(s => s.skillId);
    expect(skillIds).toEqual(expect.arrayContaining(['perception', 'body-development']));
    const skillCategories = new Map(skillIds.filter(id => id !== 'perception').map(id => [id, `category-of-${id}`]));
    const plan = planImport([soldier], [], target({ skillCategories, missingSkills: new Set(['perception']) }));
    const [{ character }] = plan.characters;
    for (const skill of character.skills) {
      if (skill.skillId === 'perception') expect(skill.categoryId).toBeUndefined();
      else expect(skill.categoryId).toBe(`category-of-${skill.skillId}`);
    }
  });
});

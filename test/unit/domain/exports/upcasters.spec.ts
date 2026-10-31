import { readFileSync } from 'fs';
import { join } from 'path';
import { CURRENT_FORMAT_VERSION } from '../../../../src/modules/exports/domain/format/export-format.js';
import { upcast, UPCASTERS } from '../../../../src/modules/exports/domain/upcasters/index.js';
import { DomainError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { V0_TEST_UPCASTER } from '../../../fixtures/exports/v0-test-upcaster.js';

const fixture = (path: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../../fixtures/exports', path), 'utf8')) as Record<string, any>;

const failure = (fn: () => unknown): DomainError => {
  try {
    fn();
  } catch (error) {
    return error as DomainError;
  }
  throw new Error('expected a failure');
};

describe('upcasters (spec 024, decision 2)', () => {
  it('leaves a file of the current version as it is', () => {
    const file = fixture('v8/character.rmu.json');
    expect(upcast(file)).toEqual({ doc: file, steps: [] });
  });

  it('applies the chain from an older version and lists the steps', () => {
    const result = upcast(fixture('v0/character.rmu.json'), [V0_TEST_UPCASTER, ...UPCASTERS]);
    expect(result.upgradedFrom).toBe(0);
    expect(result.steps.map(step => [step.from, step.to])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ]);
    expect(result.doc).toEqual(fixture('v8/character.rmu.json'));
  });

  it.each(['character', 'faction'])('adds the realms to the %s files of version 1 (spec 029)', name => {
    const result = upcast(fixture(`v1/${name}.rmu.json`));
    expect(result.steps[0]).toEqual({ from: 1, to: 2, description: 'Adds info.realmTypes from info.realmType' });
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it.each(['character', 'faction'])('keeps the %s files of version 2 as they are (spec 032)', name => {
    const result = upcast(fixture(`v2/${name}.rmu.json`));
    expect(result.steps[0]).toEqual({ from: 2, to: 3, description: 'Allows the fighting style abilities of the skills' });
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it.each(['character', 'faction'])('keeps the %s files of version 3 as they are (spec 041)', name => {
    const result = upcast(fixture(`v3/${name}.rmu.json`));
    expect(result.steps).toEqual([
      { from: 3, to: 4, description: 'Allows the improvised weapons, full suits and general equipment data of the items' },
      { from: 4, to: 5, description: 'Allows the poisonings of the injuries and the poison on the weapons' },
      { from: 5, to: 6, description: 'Allows the superior materials and the conditional modifiers of the items' },
      { from: 6, to: 7, description: 'Removes the available XP of the faction' },
      { from: 7, to: 8, description: 'Adds the NPCs of the faction' },
    ]);
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it.each(['character', 'faction'])('keeps the %s files of version 4 as they are (spec 042)', name => {
    const result = upcast(fixture(`v4/${name}.rmu.json`));
    expect(result.steps).toEqual([
      { from: 4, to: 5, description: 'Allows the poisonings of the injuries and the poison on the weapons' },
      { from: 5, to: 6, description: 'Allows the superior materials and the conditional modifiers of the items' },
      { from: 6, to: 7, description: 'Removes the available XP of the faction' },
      { from: 7, to: 8, description: 'Adds the NPCs of the faction' },
    ]);
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it.each(['character', 'faction'])('keeps the %s files of version 5 as they are (spec 043)', name => {
    const result = upcast(fixture(`v5/${name}.rmu.json`));
    expect(result.steps).toEqual([
      { from: 5, to: 6, description: 'Allows the superior materials and the conditional modifiers of the items' },
      { from: 6, to: 7, description: 'Removes the available XP of the faction' },
      { from: 7, to: 8, description: 'Adds the NPCs of the faction' },
    ]);
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it.each(['character', 'faction'])('removes the faction XP from the %s files of version 6 (spec 049)', name => {
    const result = upcast(fixture(`v6/${name}.rmu.json`));
    expect(result.steps).toEqual([
      { from: 6, to: 7, description: 'Removes the available XP of the faction' },
      { from: 7, to: 8, description: 'Adds the NPCs of the faction' },
    ]);
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it.each(['character', 'faction'])('adds an empty list of NPCs to the faction of the %s files of version 7 (spec 055)', name => {
    const result = upcast(fixture(`v7/${name}.rmu.json`));
    expect(result.steps).toEqual([{ from: 7, to: 8, description: 'Adds the NPCs of the faction' }]);
    expect(result.doc).toEqual(fixture(`v8/${name}.rmu.json`));
  });

  it('keeps the NPCs a faction file already has', () => {
    type FactionData = { faction: Record<string, unknown> };
    const file = fixture('v7/faction.rmu.json');
    const data = file.data as FactionData;
    file.data = { ...data, faction: { ...data.faction, npcs: [{ npcId: 'wolf' }] } };
    expect((upcast(file).doc.data as FactionData).faction.npcs).toEqual([{ npcId: 'wolf' }]);
  });

  it('rejects a newer version with both versions, and a file that is not an export', () => {
    const newer = failure(() => upcast({ ...fixture('v8/character.rmu.json'), formatVersion: CURRENT_FORMAT_VERSION + 1 }));
    expect(newer).toMatchObject({ statusCode: 422, code: 'export-format-too-new', details: { fileVersion: 9, supportedVersion: 8 } });
    expect(failure(() => upcast({ format: 'other' }))).toMatchObject({ code: 'export-unknown-format' });
    expect(failure(() => upcast([]))).toMatchObject({ code: 'export-unknown-format' });
    expect(failure(() => upcast({ format: 'rmu-strategic-export', formatVersion: 1.5 }))).toMatchObject({ code: 'export-unknown-format' });
  });

  it('fails when a step of the chain is missing', () => {
    expect(failure(() => upcast(fixture('v0/character.rmu.json'), []))).toMatchObject({ code: 'export-unknown-format' });
  });
});

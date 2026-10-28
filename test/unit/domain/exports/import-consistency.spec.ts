/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- example files read as loose JSON */
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ExportFile } from '../../../../src/modules/exports/domain/format/export-format.js';
import { validateConsistency } from '../../../../src/modules/exports/domain/import/import-consistency.validator.js';

const fixture = (path: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../../fixtures/exports', path), 'utf8')) as ExportFile & Record<string, any>;

describe('import consistency (spec 024, decision 11)', () => {
  it('accepts the example files', () => {
    expect(validateConsistency(fixture('v6/character.rmu.json'))).toEqual([]);
    expect(validateConsistency(fixture('v6/faction.rmu.json'))).toEqual([]);
  });

  it('rejects repeated refs, slots to unknown or unsuitable items and unknown crafters', () => {
    const file = fixture('v6/faction.rmu.json') as any;
    file.data.characters[1].ref = file.data.characters[0].ref;
    const soldier = file.data.characters.find((c: any) => c.items.length > 0);
    soldier.character.equipment.slots.body = soldier.items[0].ref;
    soldier.character.equipment.slots.head = 'i999';
    file.data.armory[0].ref = soldier.items[1].ref;
    file.data.armory[0].modifiers.push({
      id: 'x',
      type: 'quality',
      value: 1,
      appliesTo: 'all',
      source: { kind: 'crafting', crafterRef: 'c99' },
      createdAt: 'x',
    });
    const messages = validateConsistency(file).map(error => error.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Character ref c1 is repeated/),
        expect.stringMatching(/cannot go in slot body/),
        expect.stringMatching(/Slot head points to i999/),
        expect.stringMatching(/^Item ref .* is repeated/),
        expect.stringMatching(/Crafter c99 is not a character/),
      ]),
    );
  });
});

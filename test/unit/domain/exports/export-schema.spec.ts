/* eslint-disable @typescript-eslint/no-unsafe-member-access -- example files read as loose JSON */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CURRENT_FORMAT_VERSION } from '../../../../src/modules/exports/domain/format/export-format.js';
import { exportFileSchema, validateExportFile } from '../../../../src/modules/exports/application/validation/export-file.schema.js';

const FIXTURES = join(import.meta.dirname, '../../../fixtures/exports');
const fixture = (path: string) => JSON.parse(readFileSync(join(FIXTURES, path), 'utf8')) as Record<string, any>;

describe('export file schema (spec 024, decisions 2 and 11)', () => {
  it('matches the snapshot of its version: a change in the format raises CURRENT_FORMAT_VERSION', () => {
    const snapshotPath = join(FIXTURES, `schema-v${CURRENT_FORMAT_VERSION}.json`);
    const described = JSON.parse(JSON.stringify(exportFileSchema.describe())) as unknown;
    if (process.env.UPDATE_FIXTURES === '1' || !existsSync(snapshotPath)) {
      writeFileSync(snapshotPath, `${JSON.stringify(described, null, 2)}\n`);
    }
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as unknown;
    expect(
      described,
      `The schema of the export file changed. If what the file holds changed, raise CURRENT_FORMAT_VERSION, add an upcaster ` +
        `from the previous version and an example file under test/fixtures/exports/v<N>/ (ADR 0008). Then regenerate ` +
        `schema-v<N>.json with UPDATE_FIXTURES=1. If only a limit or a message changed, regenerate it for the same version.`,
    ).toEqual(snapshot);
  });

  it.each(['v5/character.rmu.json', 'v5/faction.rmu.json'])('accepts the example file %s exactly as the exporter wrote it', path => {
    const file = fixture(path);
    const { value, issues } = validateExportFile(file);
    expect(issues).toEqual([]);
    expect(value).toEqual(file);
  });

  it('reports every failure with its JSON path and drops unknown fields', () => {
    const file = fixture('v5/character.rmu.json');
    file.data.character.injuries[0].type = 'paper-cut';
    file.data.items[0].amount = -1;
    file.data.character.statistics.st.temporary = 'high';
    file.data.character.extra = 'ignored';
    const { issues } = validateExportFile(file);
    expect(issues.map(issue => issue.path)).toEqual(
      expect.arrayContaining(['data.character.injuries[0].type', 'data.items[0].amount', 'data.character.statistics.st.temporary']),
    );
    const clean = fixture('v5/character.rmu.json');
    clean.data.character.extra = 'ignored';
    expect((validateExportFile(clean).value as any).data.character).not.toHaveProperty('extra');
  });
});

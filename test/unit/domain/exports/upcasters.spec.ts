import { readFileSync } from 'fs';
import { join } from 'path';
import { CURRENT_FORMAT_VERSION } from '../../../../src/modules/exports/domain/format/export-format.js';
import { upcast } from '../../../../src/modules/exports/domain/upcasters/index.js';
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
    const file = fixture('v1/character.rmu.json');
    expect(upcast(file)).toEqual({ doc: file, steps: [] });
  });

  it('applies the chain from an older version and lists the steps', () => {
    const result = upcast(fixture('v0/character.rmu.json'), [V0_TEST_UPCASTER]);
    expect(result.upgradedFrom).toBe(0);
    expect(result.steps).toEqual([{ from: 0, to: 1, description: V0_TEST_UPCASTER.description }]);
    expect(result.doc).toEqual(fixture('v1/character.rmu.json'));
  });

  it('rejects a newer version with both versions, and a file that is not an export', () => {
    const newer = failure(() => upcast({ ...fixture('v1/character.rmu.json'), formatVersion: CURRENT_FORMAT_VERSION + 1 }));
    expect(newer).toMatchObject({ statusCode: 422, code: 'export-format-too-new', details: { fileVersion: 2, supportedVersion: 1 } });
    expect(failure(() => upcast({ format: 'other' }))).toMatchObject({ code: 'export-unknown-format' });
    expect(failure(() => upcast([]))).toMatchObject({ code: 'export-unknown-format' });
    expect(failure(() => upcast({ format: 'rmu-strategic-export', formatVersion: 1.5 }))).toMatchObject({ code: 'export-unknown-format' });
  });

  it('fails when a step of the chain is missing', () => {
    expect(failure(() => upcast(fixture('v0/character.rmu.json'), []))).toMatchObject({ code: 'export-unknown-format' });
  });
});

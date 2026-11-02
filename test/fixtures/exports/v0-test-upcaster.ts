import type { ExportDocument, Upcaster } from '../../../src/modules/exports/domain/upcasters/index.js';

/**
 * A fictitious version 0 of the format (workspace spec 024, plan step 2): it called the current hits of the character
 * `hits` instead of `hp`. It exists only in the tests, injected into UPCASTERS, so the chain of upcasters is tested
 * from the first version without a real v0 in production. v0/character.rmu.json is an example file of it.
 */
export const V0_TEST_UPCASTER: Upcaster = {
  from: 0,
  description: 'Renames data.character.hits to hp',
  up: (doc: ExportDocument): ExportDocument => {
    const data = doc.data as { character: Record<string, unknown> };
    const { hits, ...character } = data.character;
    return { ...doc, data: { ...data, character: { ...character, hp: hits } } };
  },
};

import type { CharacterAccess } from '../../../src/modules/characters/application/services/character-access.service.js';

/** A CharacterAccess that lets everything through, for the handler tests that are not about permissions. */
export const allowAllCharacterAccess = {
  checkChange: () => Promise.resolve(),
  canChange: () => Promise.resolve(true),
  checkRead: () => Promise.resolve(),
  checkCreate: () => undefined,
  readFilter: () => Promise.resolve({ type: 'empty' }),
} as unknown as CharacterAccess;

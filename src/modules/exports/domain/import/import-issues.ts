/**
 * Errors and warnings of an import (workspace spec 024, decisions 8, 11 and 13). Errors block the import (the preview
 * still shows them); warnings do not. `code` is stable, for the translations of the clients.
 */
export type ImportErrorCode = 'export-invalid-file' | 'export-missing-reference' | 'export-character-ref-required' | 'export-wrong-kind';

export type ImportWarningCode =
  | 'import-warning-missing-skill'
  | 'import-warning-missing-trait'
  | 'import-warning-missing-item-type'
  | 'import-warning-realm-mismatch'
  | 'import-warning-external-image'
  | 'import-warning-app-version'
  | 'import-warning-hp-clipped'
  | 'import-warning-power-clipped'
  | 'import-warning-race-skill-bonus'
  | 'import-warning-unknown-specialization';

export interface ImportIssue<C extends string = string> {
  code: C;
  message: string;
  /** JSON path in the file, like `data.characters[0].character.info.raceId`. */
  path?: string;
  /** What the issue is about: a missing race, a reference of the file... */
  kind?:
    'race' | 'profession' | 'culture' | 'skill' | 'trait' | 'item-type' | 'ref' | 'slot' | 'realm' | 'image' | 'version' | 'hp' | 'power';
  id?: string;
  name?: string | null;
}

export type ImportError = ImportIssue<ImportErrorCode>;
export type ImportWarning = ImportIssue<ImportWarningCode>;

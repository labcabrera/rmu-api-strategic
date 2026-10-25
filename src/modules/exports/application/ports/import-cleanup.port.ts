/** Undoes a failed import (workspace spec 024, decision 12): removes every document that carries its importId. */
export interface ImportCleanupPort {
  deleteByImportId(importId: string): Promise<void>;
}

export const IMPORT_CLEANUP = Symbol('ImportCleanupPort');

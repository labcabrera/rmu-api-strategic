import { UnprocessableError } from '../../../shared/domain/errors/errors.js';
import { CURRENT_FORMAT_VERSION, EXPORT_FORMAT } from '../format/export-format.js';

/**
 * Upcasters of the export file (workspace spec 024, decision 2; ADR 0008): pure functions that turn a file of
 * `formatVersion` N into one of N + 1. Importing a file applies them in order up to CURRENT_FORMAT_VERSION, so only
 * the current format has to be validated, built and maintained.
 *
 * A change in what the file holds raises CURRENT_FORMAT_VERSION and adds here the step from the previous version,
 * with an example file in test/fixtures/exports/v<N>/ and the snapshot of the schema regenerated.
 */
export type ExportDocument = Record<string, unknown>;

export interface Upcaster {
  /** The version it reads: it returns a file of `from + 1`. */
  from: number;
  /** Short English description of the change, shown in the preview. */
  description: string;
  up: (doc: ExportDocument) => ExportDocument;
}

/** Version 1 is the first one: nothing to upcast yet. */
export const UPCASTERS: Upcaster[] = [];

export interface UpcastStep {
  from: number;
  to: number;
  description: string;
}

export interface UpcastResult {
  doc: ExportDocument;
  upgradedFrom?: number;
  steps: UpcastStep[];
}

const isObject = (value: unknown): value is ExportDocument => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Brings a file to the current version. `export-unknown-format` when it is not an export file of strategic,
 * `export-format-too-new` when it comes from a newer version of the application.
 */
export function upcast(file: unknown, upcasters: Upcaster[] = UPCASTERS, current: number = CURRENT_FORMAT_VERSION): UpcastResult {
  if (!isObject(file) || file.format !== EXPORT_FORMAT) {
    throw new UnprocessableError('The file is not an export of rmu-api-strategic', 'export-unknown-format', {
      expectedFormat: EXPORT_FORMAT,
    });
  }
  const version = file.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new UnprocessableError('The file has no valid formatVersion', 'export-unknown-format', { formatVersion: version ?? null });
  }
  if (version > current) {
    throw new UnprocessableError(
      `The file was exported with a newer version of the format (${version}): update the application (it supports ${current})`,
      'export-format-too-new',
      { fileVersion: version, supportedVersion: current },
    );
  }
  let doc: ExportDocument = structuredClone(file);
  const steps: UpcastStep[] = [];
  for (let from = version; from < current; from++) {
    const upcaster = upcasters.find(candidate => candidate.from === from);
    if (!upcaster) {
      throw new UnprocessableError(`Format version ${from} cannot be upgraded`, 'export-unknown-format', { formatVersion: version });
    }
    doc = { ...upcaster.up(doc), formatVersion: from + 1 };
    steps.push({ from, to: from + 1, description: upcaster.description });
  }
  return steps.length > 0 ? { doc, upgradedFrom: version, steps } : { doc, steps };
}

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

type CharacterInfoDocument = { realmType?: string; realmTypes?: string[] } & Record<string, unknown>;
type CharacterDocument = { info?: CharacterInfoDocument } & Record<string, unknown>;

const withRealmTypes = (character: CharacterDocument): CharacterDocument =>
  character.info
    ? { ...character, info: { ...character.info, realmTypes: character.info.realmTypes ?? [character.info.realmType!] } }
    : character;

/** Version 1 is the first one. */
export const UPCASTERS: Upcaster[] = [
  {
    // Spec 029: the two realms of a hybrid; the skills may also have the realm stat placeholder in their statistics
    from: 1,
    description: 'Adds info.realmTypes from info.realmType',
    up: (doc: ExportDocument): ExportDocument => {
      // A character file has data.character; a faction file, data.characters[].character
      type FactionEntry = { character: CharacterDocument } & Record<string, unknown>;
      const data = doc.data as { character?: CharacterDocument; characters?: FactionEntry[] } & Record<string, unknown>;
      return {
        ...doc,
        data: {
          ...data,
          ...(data.character ? { character: withRealmTypes(data.character) } : {}),
          ...(data.characters
            ? { characters: data.characters.map(entry => ({ ...entry, character: withRealmTypes(entry.character) })) }
            : {}),
        },
      };
    },
  },
  {
    // Workspace spec 032: the skills of a fighting style may have styleAbilities; older files have none to change
    from: 2,
    description: 'Allows the fighting style abilities of the skills',
    up: (doc: ExportDocument): ExportDocument => doc,
  },
  {
    // Workspace spec 041: optional obModifier of the weapon modes, coverage and class of the armor, lotSize and
    // features of the catalog copy; older files have none to change
    from: 3,
    description: 'Allows the improvised weapons, full suits and general equipment data of the items',
    up: (doc: ExportDocument): ExportDocument => doc,
  },
  {
    // Workspace spec 042: optional poison block of the injuries, injuryId of their sources, the poison source kind and
    // the coating of the weapons; older files have none to change
    from: 4,
    description: 'Allows the poisonings of the injuries and the poison on the weapons',
    up: (doc: ExportDocument): ExportDocument => doc,
  },
  {
    // Workspace spec 043: optional material of the items and condition of their modifiers; older files have none
    from: 5,
    description: 'Allows the superior materials and the conditional modifiers of the items',
    up: (doc: ExportDocument): ExportDocument => doc,
  },
];

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

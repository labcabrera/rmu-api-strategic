# AGENTS.md

Guidance for coding agents in rmu-api-strategic. The workspace `AGENTS.md` (one level up) and the README of
rmu-api-core hold the conventions shared by every API; this file only holds what is particular to this one.

## Export format (workspace spec 024, ADR 0008 of rmu-platform)

The export file of characters and factions (`src/modules/exports/`) is a public contract: users keep these files and
import them into newer versions. It is built by explicit mappers (`domain/mappers/`), never from the Mongo documents.

A change in `CharacterProps`, `ItemProps` or `FactionProps` (or in their value objects) that changes what is exported or
imported must:

1. raise `CURRENT_FORMAT_VERSION` in `domain/format/export-format.ts`;
2. add the upcaster from the previous version to `UPCASTERS` in `domain/upcasters/index.ts`, as a pure function;
3. update the mappers, the planner and the schema (`application/validation/export-file.schema.ts`);
4. add example files for the new version under `test/fixtures/exports/v<N>/` (`UPDATE_FIXTURES=1 pnpm test:e2e`
   rewrites them from `test/e2e/exports.e2e-spec.ts`) and keep the old ones, which the tests import through the chain;
5. regenerate the schema snapshot `test/fixtures/exports/schema-v<N>.json` (`UPDATE_FIXTURES=1 pnpm test`).

`test/unit/domain/exports/export-schema.spec.ts` fails when the schema changes without its snapshot: that is the
reminder. A change that only adds an internal field, not exported, needs none of this.

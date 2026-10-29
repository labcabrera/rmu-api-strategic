import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import type { Race } from '../../../characters/application/ports/race-client.port.js';
import { type TraitClientPort, TRAIT_CLIENT } from '../../../characters/application/ports/trait-client.port.js';
import { mapRaceTraits } from '../../../characters/application/services/race-traits.mapper.js';
import { BODY_DEVELOPMENT_SKILL, Character } from '../../../characters/domain/aggregates/character.js';
import { CharacterCreatedEvent } from '../../../characters/domain/events/character.events.js';
import { CharacterProcessorService } from '../../../characters/domain/services/character-processor.service.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../factions/application/ports/faction-repository.port.js';
import { Faction } from '../../../factions/domain/aggregates/faction.js';
import { FactionManagement } from '../../../factions/domain/value-objects/faction-management.vo.js';
import { Game } from '../../../games/domain/aggregates/game.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../items/application/ports/item-repository.port.js';
import { ItemLedger } from '../../../items/application/services/item-ledger.service.js';
import { GOLD_COIN, Item } from '../../../items/domain/aggregates/item.js';
import { ItemHolders } from '../../../items/domain/value-objects/item-holder.vo.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import { NamedEntity } from '../../../shared/domain/entities/named-entity.js';
import { PayloadTooLargeError, UnprocessableError, ValidationError } from '../../../shared/domain/errors/errors.js';
import {
  type CharacterEntry,
  CURRENT_FORMAT_VERSION,
  type ExportFile,
  type ExportKind,
  type ItemExport,
  MAX_IMPORT_CHARACTERS,
  MAX_IMPORT_ITEMS,
} from '../../domain/format/export-format.js';
import { characterEntries, validateConsistency } from '../../domain/import/import-consistency.validator.js';
import type { ImportError, ImportWarning } from '../../domain/import/import-issues.js';
import { type ImportPlan, planImport } from '../../domain/import/import-planner.js';
import { upcast, type UpcastStep } from '../../domain/upcasters/index.js';
import { type ImportCleanupPort, IMPORT_CLEANUP } from '../ports/import-cleanup.port.js';
import { validateExportFile } from '../validation/export-file.schema.js';
import { appVersion } from './app-version.js';
import { ImportReferenceResolver } from './import-reference.resolver.js';

/** The preview of an import (workspace spec 024, decision 13). */
export interface ImportPreview {
  kind: ExportKind;
  /** What the import creates: a character into the faction, or a faction (with its characters) into the game. */
  target: 'character' | 'faction';
  name: string;
  formatVersion: number;
  currentFormatVersion: number;
  appVersion: string;
  currentAppVersion: string;
  upgradedFrom?: number;
  steps: UpcastStep[];
  source: { gameName: string; factionName: string; realmName: string | null; exportedAt: string };
  summary: { characters: number; items: number; gold: number };
  /** Characters of the file: the choice when a character is taken from a faction file. */
  characters: { ref: string; name: string; level: number; raceName: string }[];
  characterRef?: string;
  warnings: ImportWarning[];
  errors: ImportError[];
}

export interface ImportResult {
  kind: ExportKind;
  target: 'character' | 'faction';
  importId: string;
  factionId: string;
  characterIds: string[];
  itemCount: number;
  warnings: ImportWarning[];
}

/** An import into a faction (a character) or into a game (a faction). */
export type ImportDestination =
  { target: 'character'; game: Game; faction: Faction; characterRef?: string } | { target: 'faction'; game: Game };

export interface PreparedImport {
  preview: ImportPreview;
  /** Only without errors. */
  plan?: ImportPlan;
  faction?: Faction;
  importId: string;
  file: ExportFile;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * The import of an export file (workspace spec 024, decisions 5-12). `prepare` does everything but writing, and is the
 * whole dry run: upcasters, schema, coherence, references, the destination race and the character processor. `write`
 * stores the plan and, when a step fails, removes what it stored (there are no transactions).
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    @Inject(TRAIT_CLIENT) private readonly traitClient: TraitClientPort,
    @Inject(IMPORT_CLEANUP) private readonly cleanup: ImportCleanupPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
    private readonly resolver: ImportReferenceResolver,
    private readonly processor: CharacterProcessorService,
    private readonly ledger: ItemLedger,
  ) {}

  async prepare(raw: unknown, destination: ImportDestination, userId: string): Promise<PreparedImport> {
    this.checkLimits(raw);
    const upcasted = upcast(raw);
    const { value, issues } = validateExportFile(upcasted.doc);
    if (issues.length > 0) {
      throw new ValidationError(`The file is not valid: ${issues[0].path} ${issues[0].message}`, 'export-invalid-file', { issues });
    }
    const file = value as ExportFile;
    if (destination.target === 'faction' && file.kind !== 'faction') {
      throw new UnprocessableError('A faction can only be imported from a faction file', 'export-wrong-kind', {
        expected: 'faction',
        kind: file.kind,
      });
    }
    const originalVersion = upcasted.upgradedFrom ?? file.formatVersion;
    const errors: ImportError[] = validateConsistency(file);
    const warnings: ImportWarning[] = [];

    const all = characterEntries(file);
    let selected = all;
    let armory: ItemExport[] = [];
    let characterRef: string | undefined;
    if (destination.target === 'faction' && file.kind === 'faction') {
      armory = file.data.armory;
    } else if (file.kind === 'faction') {
      characterRef = destination.target === 'character' ? destination.characterRef : undefined;
      selected = characterRef ? all.filter(({ entry }) => entry.ref === characterRef) : [];
      if (selected.length === 0) {
        errors.push({
          code: 'export-character-ref-required',
          message: characterRef ? `The file has no character ${characterRef}` : 'Choose one of the characters of the file',
          kind: 'ref',
          ...(characterRef ? { id: characterRef } : {}),
        });
      }
    }

    const references = await this.resolver.resolve(selected, armory);
    errors.push(...references.errors);
    warnings.push(...references.warnings, ...this.sourceWarnings(file, destination.game, selected, armory));

    const importId = randomUUID();
    const faction = destination.target === 'faction' ? this.newFaction(file, destination.game, userId, importId) : destination.faction;
    let plan: ImportPlan | undefined;
    if (errors.length === 0) {
      plan = planImport(
        selected.map(({ entry }) => entry),
        armory,
        {
          gameId: destination.game.id,
          faction: new NamedEntity(faction.id, faction.name),
          owner: userId,
          importId,
          missingSkills: references.missingSkills,
          skillCategories: references.skillCategories,
          missingTraits: references.missingTraits,
          characterNames: new Map(all.map(({ entry }) => [entry.ref, entry.character.name])),
        },
      );
      for (const planned of plan.characters) {
        const failure = await this.rebuild(planned.character, planned.entry, planned.items, references.races, warnings);
        if (failure) errors.push(failure);
      }
      if (errors.length > 0) plan = undefined;
    }

    const items = [...selected.flatMap(({ entry }) => entry.items), ...armory];
    const factionGold = destination.target === 'faction' && file.kind === 'faction' ? file.data.faction.management.availableGold : 0;
    const preview: ImportPreview = {
      kind: file.kind,
      target: destination.target,
      name:
        destination.target === 'faction' && file.kind === 'faction'
          ? file.data.faction.name
          : (selected[0]?.entry.character.name ?? (file.kind === 'faction' ? file.data.faction.name : '')),
      formatVersion: originalVersion,
      currentFormatVersion: CURRENT_FORMAT_VERSION,
      appVersion: file.source.appVersion,
      currentAppVersion: appVersion(),
      ...(upcasted.upgradedFrom !== undefined ? { upgradedFrom: upcasted.upgradedFrom } : {}),
      steps: upcasted.steps,
      source: {
        gameName: file.source.gameName,
        factionName: file.source.factionName,
        realmName: file.source.realmName,
        exportedAt: file.exportedAt,
      },
      summary: {
        characters: selected.length,
        items: items.length,
        gold: round(factionGold + items.filter(item => item.itemTypeId === GOLD_COIN).reduce((sum, item) => sum + (item.amount ?? 0), 0)),
      },
      characters: all.map(({ entry }) => ({
        ref: entry.ref,
        name: entry.character.name,
        level: entry.character.experience.level,
        raceName: entry.character.info.raceName,
      })),
      ...(characterRef ? { characterRef } : {}),
      warnings,
      errors,
    };
    return { preview, plan, faction: destination.target === 'faction' ? faction : undefined, importId, file };
  }

  /** Stores a prepared import. Its errors, if any, are a 422 with the code of the first one and all of them in `details`. */
  async write(prepared: PreparedImport, userId: string, fileName: string | undefined): Promise<ImportResult> {
    const { preview, plan, importId } = prepared;
    if (!plan || preview.errors.length > 0) {
      const first = preview.errors[0];
      throw new UnprocessableError(first?.message ?? 'The file cannot be imported', first?.code ?? 'export-invalid-file', {
        errors: preview.errors,
      });
    }
    const factionId = prepared.faction?.id ?? plan.characters[0]?.character.faction.id ?? plan.armory[0]?.factionId ?? '';
    try {
      if (prepared.faction) await this.factionRepository.save(prepared.faction);
      for (const item of plan.armory) await this.itemRepository.save(item);
      for (const { character, items } of plan.characters) {
        await this.characterRepository.save(character);
        for (const item of items) await this.itemRepository.save(item);
      }
    } catch (error) {
      this.logger.warn(`Import ${importId} failed, removing what it stored: ${(error as Error).message}`);
      await this.cleanup.deleteByImportId(importId);
      throw error;
    }

    if (prepared.faction) await this.events.publishChanges('faction', prepared.faction);
    for (const item of plan.armory) await this.events.publishChanges('item', item);
    for (const { character, items } of plan.characters) {
      character.uncommit();
      await this.events.publish('character', new CharacterCreatedEvent(character.getProps()));
      for (const item of items) await this.events.publishChanges('item', item);
    }
    await this.recordLedger(prepared, plan, userId, fileName);

    return {
      kind: preview.kind,
      target: preview.target,
      importId,
      factionId,
      characterIds: plan.characters.map(({ character }) => character.id),
      itemCount: plan.armory.length + plan.characters.reduce((sum, { items }) => sum + items.length, 0),
      warnings: preview.warnings,
    };
  }

  /** Limits of decision 11, on the raw file: a file above them is not even validated. */
  private checkLimits(raw: unknown): void {
    const data = isObject(raw) && isObject(raw.data) ? raw.data : {};
    const characters = Array.isArray(data.characters) ? data.characters : [];
    const count = (items: unknown) => (Array.isArray(items) ? items.length : 0);
    const items =
      count(data.items) +
      count(data.armory) +
      characters.reduce((sum: number, entry: unknown) => sum + (isObject(entry) ? count(entry.items) : 0), 0);
    if (characters.length > MAX_IMPORT_CHARACTERS || items > MAX_IMPORT_ITEMS) {
      throw new PayloadTooLargeError(
        `The file has ${characters.length} characters and ${items} items (at most ${MAX_IMPORT_CHARACTERS} and ${MAX_IMPORT_ITEMS})`,
        'export-too-large',
        { characters: characters.length, items, maxCharacters: MAX_IMPORT_CHARACTERS, maxItems: MAX_IMPORT_ITEMS },
      );
    }
  }

  private newFaction(file: ExportFile, game: Game, userId: string, importId: string): Faction {
    const data = file.kind === 'faction' ? file.data.faction : undefined;
    return Faction.create({
      gameId: game.id,
      name: data?.name ?? file.source.factionName,
      management: new FactionManagement(data?.management.availableGold ?? 0),
      shortDescription: data?.shortDescription ?? undefined,
      description: data?.description ?? undefined,
      imageUrl: data?.imageUrl ?? undefined,
      owner: userId,
      importId,
    });
  }

  /**
   * Decision 7: the destination race and the character processor give the derived values; the current hits and
   * power are then restored, never above their maximum.
   */
  private async rebuild(
    character: Character,
    entry: CharacterEntry,
    items: Item[],
    races: Map<string, Race>,
    warnings: ImportWarning[],
  ): Promise<ImportError | undefined> {
    const race = races.get(character.info.race.id)!;
    const data = entry.character;
    try {
      character.syncRaceTraits(await mapRaceTraits(race.traits, this.traitClient));
      const skillBonuses = (race.skillBonuses || []).filter(bonus => {
        if (character.findSkill(bonus.skillId, bonus.specialization)) return true;
        warnings.push({
          code: 'import-warning-race-skill-bonus',
          message: `${character.name} has no skill ${bonus.skillId} for the racial bonus of ${race.name}`,
          kind: 'skill',
          id: bonus.skillId,
          name: character.name,
        });
        return false;
      });
      const hasBodyDevelopment = !!character.findSkill(BODY_DEVELOPMENT_SKILL, null);
      character.updateRace({
        raceName: race.name,
        sizeId: data.info.sizeId,
        stats: race.stats || ({} as Race['stats']),
        resistances: race.resistances || new Map(),
        strideBonus: race.strideBonus || 0,
        enduranceBonus: race.enduranceBonus || 0,
        recoveryMultiplier: race.recoveryMultiplier || 1,
        baseHits: hasBodyDevelopment ? race.baseHits || 0 : 0,
        baseAt: race.baseAt || 1,
        skillBonuses,
      });
      this.processor.process(character, items);
    } catch (error) {
      return {
        code: 'export-invalid-file',
        message: `${character.name} cannot be rebuilt: ${(error as Error).message}`,
        kind: 'ref',
        id: entry.ref,
        name: character.name,
      };
    }
    character.hp.current = this.clip(data.hp.current, character.hp.max, character.name, 'hp', warnings);
    if (character.power && data.power) {
      character.power.current = this.clip(data.power.current, character.power.max, character.name, 'power', warnings);
    }
    return undefined;
  }

  private clip(value: number, max: number, name: string, kind: 'hp' | 'power', warnings: ImportWarning[]): number {
    if (value <= max) return value;
    warnings.push({
      code: kind === 'hp' ? 'import-warning-hp-clipped' : 'import-warning-power-clipped',
      message: `${name}: ${kind} ${value} lowered to the maximum ${max}`,
      kind,
      name,
    });
    return max;
  }

  private sourceWarnings(file: ExportFile, game: Game, entries: { entry: CharacterEntry }[], armory: ItemExport[]): ImportWarning[] {
    const warnings: ImportWarning[] = [];
    if (file.source.realmId && file.source.realmId !== game.realmId) {
      warnings.push({
        code: 'import-warning-realm-mismatch',
        message: `The file comes from realm ${file.source.realmName ?? file.source.realmId}, this game is in ${game.realmName}`,
        kind: 'realm',
        id: file.source.realmId,
        name: file.source.realmName,
      });
    }
    if (file.source.appVersion !== appVersion()) {
      warnings.push({
        code: 'import-warning-app-version',
        message: `Exported with version ${file.source.appVersion}, this is ${appVersion()}`,
        kind: 'version',
        id: file.source.appVersion,
      });
    }
    // Decision 9: an absolute URL (an image of rmu-api-media of another installation) may not load here
    const images = [
      ...(file.kind === 'faction' ? [{ name: file.data.faction.name, url: file.data.faction.imageUrl }] : []),
      ...entries.map(({ entry }) => ({ name: entry.character.name, url: entry.character.imageUrl })),
      ...armory.map(item => ({ name: item.name, url: item.catalog?.imageUrl ?? null })),
    ];
    for (const { name, url } of images) {
      if (url && /^https?:\/\//i.test(url)) {
        warnings.push({
          code: 'import-warning-external-image',
          message: `The image of ${name} may not load here: ${url}`,
          kind: 'image',
          name,
        });
      }
    }
    return warnings;
  }

  private async recordLedger(prepared: PreparedImport, plan: ImportPlan, userId: string, fileName: string | undefined): Promise<void> {
    const details = {
      formatVersion: prepared.preview.formatVersion,
      appVersion: prepared.file.source.appVersion,
      sourceGameName: prepared.file.source.gameName,
      fileName: fileName ?? null,
    };
    const items = [...plan.armory, ...plan.characters.flatMap(({ items }) => items)];
    for (const item of items) {
      await this.ledger.record({
        gameId: item.gameId,
        kind: 'import',
        itemId: item.id,
        itemTypeId: item.itemTypeId,
        itemName: item.name,
        amount: item.amount,
        from: null,
        to: ItemHolders.of(item),
        userId,
        details,
      });
    }
    const gold = prepared.faction?.management.availableGold ?? 0;
    if (prepared.faction && gold > 0) {
      const holder = { kind: 'faction' as const, id: prepared.faction.id };
      await this.ledger.record({
        gameId: prepared.faction.gameId,
        kind: 'import',
        itemId: null,
        itemTypeId: null,
        itemName: null,
        amount: gold,
        from: null,
        to: holder,
        payments: [{ holder, gold }],
        userId,
        details,
      });
    }
  }
}

const round = (value: number) => Math.round(value * 1000) / 1000;

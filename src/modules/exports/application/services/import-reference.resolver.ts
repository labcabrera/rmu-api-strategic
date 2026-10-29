import { Inject, Injectable } from '@nestjs/common';
import { type Culture, type CultureClientPort, CULTURE_CLIENT } from '../../../characters/application/ports/culture-client.port.js';
import { type ProfessionClientPort, PROFESSION_CLIENT } from '../../../characters/application/ports/profession-client.port.js';
import { type Race, type RaceClientPort, RACE_CLIENT } from '../../../characters/application/ports/race-client.port.js';
import { type SkillClientPort, SKILL_CLIENT } from '../../../characters/application/ports/skill-client.port.js';
import { type TraitClientPort, TRAIT_CLIENT } from '../../../characters/application/ports/trait-client.port.js';
import { type ItemClientPort, ITEM_CLIENT } from '../../../items/application/ports/item-client.port.js';
import { BadGatewayError, GatewayTimeoutError } from '../../../shared/domain/errors/errors.js';
import { isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { CharacterEntry, ItemExport } from '../../domain/format/export-format.js';
import type { ImportError, ImportWarning } from '../../domain/import/import-issues.js';

export interface ResolvedReferences {
  races: Map<string, Race>;
  cultures: Map<string, Culture>;
  missingSkills: Set<string>;
  /** Spec 044, decision 4: the category of each skill of the file that core has, for the category talents. */
  skillCategories: Map<string, string>;
  /** Specialization category of each catalog skill (`language`, `region`...), spec 050 */
  skillSpecializations: Map<string, string>;
  missingTraits: Set<string>;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/**
 * Resolves the external ids of a file against the catalogs of this installation (workspace spec 024, decision 8):
 * a missing race, profession or culture blocks the import; a missing skill, trait or item type is only a warning.
 * Each id is asked once per request. When core or items do not answer, the import fails with their error instead of
 * reporting the ids as missing.
 */
@Injectable()
export class ImportReferenceResolver {
  constructor(
    @Inject(RACE_CLIENT) private readonly raceClient: RaceClientPort,
    @Inject(PROFESSION_CLIENT) private readonly professionClient: ProfessionClientPort,
    @Inject(CULTURE_CLIENT) private readonly cultureClient: CultureClientPort,
    @Inject(SKILL_CLIENT) private readonly skillClient: SkillClientPort,
    @Inject(TRAIT_CLIENT) private readonly traitClient: TraitClientPort,
    @Inject(ITEM_CLIENT) private readonly itemClient: ItemClientPort,
  ) {}

  async resolve(entries: { entry: CharacterEntry; path: string }[], armory: ItemExport[]): Promise<ResolvedReferences> {
    const result: ResolvedReferences = {
      races: new Map(),
      cultures: new Map(),
      missingSkills: new Set(),
      skillCategories: new Map(),
      skillSpecializations: new Map(),
      missingTraits: new Set(),
      errors: [],
      warnings: [],
    };
    const missing = (kind: 'race' | 'profession' | 'culture', id: string, name: string | null, path: string) =>
      result.errors.push({ code: 'export-missing-reference', message: `The ${kind} ${id} does not exist here`, kind, id, name, path });

    const professions = new Map<string, boolean>();
    for (const { entry, path } of entries) {
      const info = entry.character.info;
      if (!result.races.has(info.raceId)) {
        const race = await this.find(() => this.raceClient.getRaceById(info.raceId));
        if (race) result.races.set(info.raceId, race);
        else if (!result.errors.some(e => e.kind === 'race' && e.id === info.raceId)) {
          missing('race', info.raceId, info.raceName, `${path}.character.info.raceId`);
        }
      }
      if (!professions.has(info.professionId)) {
        const profession = await this.find(() => this.professionClient.getProfessionById(info.professionId));
        professions.set(info.professionId, !!profession);
        if (!profession) missing('profession', info.professionId, null, `${path}.character.info.professionId`);
      }
      if (info.cultureId && !result.cultures.has(info.cultureId)) {
        const culture = await this.find(() => this.cultureClient.getCultureById(info.cultureId!));
        if (culture) result.cultures.set(info.cultureId, culture);
        else if (!result.errors.some(e => e.kind === 'culture' && e.id === info.cultureId)) {
          missing('culture', info.cultureId, null, `${path}.character.info.cultureId`);
        }
      }
    }

    // One request for the whole catalog, which also gives the category of each skill (spec 044, decision 4)
    const catalog = (await this.skillClient.getAllSkills()).content;
    const catalogSkills = new Map(catalog.map(skill => [skill.id, skill.categoryId] as const));
    catalog.forEach(skill => skill.specialization && result.skillSpecializations.set(skill.id, skill.specialization));
    const skillIds = new Set(entries.flatMap(({ entry }) => entry.character.skills.map(skill => skill.skillId)));
    for (const skillId of skillIds) {
      const categoryId = catalogSkills.get(skillId);
      if (catalogSkills.has(skillId)) {
        if (categoryId) result.skillCategories.set(skillId, categoryId);
        continue;
      }
      result.missingSkills.add(skillId);
      result.warnings.push({
        code: 'import-warning-missing-skill',
        message: `Skill ${skillId} does not exist here: it keeps its ranks and is marked`,
        kind: 'skill',
        id: skillId,
      });
    }

    const traits = new Map(entries.flatMap(({ entry }) => entry.character.traits.map(trait => [trait.traitId, trait.traitName] as const)));
    for (const [traitId, traitName] of traits) {
      if (await this.find(() => this.traitClient.getTraitById(traitId))) continue;
      result.missingTraits.add(traitId);
      result.warnings.push({
        code: 'import-warning-missing-trait',
        message: `Trait ${traitId} does not exist here: it is kept without effect`,
        kind: 'trait',
        id: traitId,
        name: traitName,
      });
    }

    const itemTypes = new Map(
      [...entries.flatMap(({ entry }) => entry.items), ...armory].map(item => [item.itemTypeId, item.name] as const),
    );
    for (const [itemTypeId, name] of itemTypes) {
      if (await this.find(() => this.itemClient.getItemById(itemTypeId))) continue;
      result.warnings.push({
        code: 'import-warning-missing-item-type',
        message: `Item type ${itemTypeId} does not exist here: the item keeps its own copy`,
        kind: 'item-type',
        id: itemTypeId,
        name,
      });
    }
    return result;
  }

  /** The entity, or undefined when the other API says it does not exist. Any other failure is thrown. */
  private async find<T>(call: () => Promise<T | undefined>): Promise<T | undefined> {
    try {
      return (await call()) ?? undefined;
    } catch (error) {
      if (isUpstreamHttpError(error)) {
        if (error.status === 404) return undefined;
        throw error;
      }
      if (error instanceof BadGatewayError || error instanceof GatewayTimeoutError) throw error;
      return undefined;
    }
  }
}

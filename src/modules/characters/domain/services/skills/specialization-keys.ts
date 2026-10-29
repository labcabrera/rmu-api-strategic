import { toKey } from '../../../../shared/domain/services/key.js';

/**
 * Specialization categories whose values are core enumerations (spec 050): the character stores their normalized key
 * and the value must exist in the catalog of the realm or the global one. Spell lists, fighting styles and the rest
 * (race names, free text) keep their own identifiers.
 */
export const CATALOG_SPECIALIZATION_CATEGORIES: ReadonlySet<string> = new Set([
  'animal-type',
  'creature-lore',
  'environment',
  'historic-lore',
  'language',
  'material-lore',
  'melee-weapon-type',
  'outlook-type',
  'race-archetype',
  'ranged-weapon-type',
  'region',
  'religion',
  'skill-administration',
  'skill-combat-training',
  'skill-culinary',
  'skill-directed-spell',
  'skill-fabric-craft',
  'skill-flying',
  'skill-influence',
  'skill-leathercraft',
  'skill-magic-ritual',
  'skill-mechanics',
  'skill-metalcraft',
  'skill-music',
  'skill-service',
  'skill-stonecraft',
  'skill-trade',
  'skill-woodcraft',
  'spell-lore',
  'unarmed-ag-attack',
  'unarmed-st-attack',
  'vehicle',
]);

export const isCatalogSpecialization = (category: string | null | undefined): boolean =>
  !!category && CATALOG_SPECIALIZATION_CATEGORIES.has(category);

/** The specialization as the character stores it: the normalized key for catalog categories, trimmed otherwise. */
export function specializationKey(category: string | null | undefined, specialization: string | null | undefined): string | null {
  const value = specialization?.trim();
  if (!value) return null;
  return isCatalogSpecialization(category) ? toKey(value) || null : value;
}

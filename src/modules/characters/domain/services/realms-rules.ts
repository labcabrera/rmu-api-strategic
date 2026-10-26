import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { CHARACTER_REALMS, type CharacterRealm } from '../value-objects/character-realm.vo.js';

export interface ProfessionRealms {
  fixedRealmTypes?: string[] | null;
  availableRealmTypes?: string[] | null;
}

/**
 * Checks the realms of a character against its profession: the fixed realms of a spellcaster (two for a hybrid), or
 * one of the available realms of an arms profession. A profession without realms accepts any single realm.
 */
export function validateRealms(realms: string[], profession: ProfessionRealms): CharacterRealm[] {
  const unique = [...new Set(realms)];
  if (unique.length === 0 || unique.some(realm => !CHARACTER_REALMS.includes(realm as CharacterRealm))) {
    throw new ValidationError(`Invalid realms: ${realms.join(', ')}`, 'err-invalid-realm');
  }
  const fixed = profession.fixedRealmTypes ?? [];
  if (fixed.length > 0) {
    if (unique.length !== fixed.length || !fixed.every(realm => unique.includes(realm))) {
      throw new ValidationError(`The profession requires the realms ${fixed.join(', ')}`, 'err-invalid-realm');
    }
    return fixed as CharacterRealm[];
  }
  const available = profession.availableRealmTypes ?? [];
  if (unique.length !== 1 || (available.length > 0 && !available.includes(unique[0]))) {
    throw new ValidationError(`The profession allows one realm of ${available.join(', ')}`, 'err-invalid-realm');
  }
  return unique as CharacterRealm[];
}

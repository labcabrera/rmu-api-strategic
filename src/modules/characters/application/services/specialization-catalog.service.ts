import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { isCatalogSpecialization } from '../../domain/services/skills/specialization-keys.js';
import { ENUMERATION_CLIENT, type EnumerationClientPort } from '../ports/enumeration-client.port.js';

export interface SpecializationRef {
  skillId: string;
  /** Specialization category of the skill (`language`, `region`...) */
  category: string | null | undefined;
  specialization: string | null;
}

/**
 * Checks that the specializations of catalog categories exist as enumerations of the realm or global ones (spec 050).
 * The values must already be normalized keys.
 */
@Injectable()
export class SpecializationCatalogService {
  constructor(@Inject(ENUMERATION_CLIENT) private readonly enumerationClient: EnumerationClientPort) {}

  async check(refs: SpecializationRef[], realmId: string | null): Promise<void> {
    const unknown = await this.unknown(refs, realmId);
    if (unknown.length) {
      const list = unknown.map(ref => `${ref.skillId}@${ref.specialization}`).join(', ');
      throw new ValidationError(`Specializations not in the catalog of the realm: ${list}`, 'err-unknown-specialization');
    }
  }

  /** The references whose specialization is not in the catalog, with one request per category. */
  async unknown(refs: SpecializationRef[], realmId: string | null): Promise<SpecializationRef[]> {
    const checked = refs.filter(ref => ref.specialization && isCatalogSpecialization(ref.category));
    const categories = [...new Set(checked.map(ref => ref.category!))];
    const keys = new Map<string, Set<string>>();
    await Promise.all(
      categories.map(async category => keys.set(category, new Set(await this.enumerationClient.getKeys(category, realmId)))),
    );
    return checked.filter(ref => !keys.get(ref.category!)!.has(ref.specialization!));
  }
}

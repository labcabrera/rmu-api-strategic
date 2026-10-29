export interface EnumerationClientPort {
  /** Keys of a category visible in a realm: those of the realm and the global ones (spec 050). */
  getKeys(category: string, realmId: string | null): Promise<string[]>;
}

export const ENUMERATION_CLIENT = Symbol('EnumerationClientPort');

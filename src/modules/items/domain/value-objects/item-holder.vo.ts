import { ValidationError } from '../../../shared/domain/errors/errors.js';

/** Who holds an item (workspace spec 023, decision 1): a character or a faction (its armory) of the same game. */
export type ItemHolderKind = 'character' | 'faction';
export const ITEM_HOLDER_KINDS: ItemHolderKind[] = ['character', 'faction'];

export interface ItemHolder {
  kind: ItemHolderKind;
  id: string;
}

export const ItemHolders = {
  /** The holder stored as `characterId` or `factionId`: exactly one of them is set. */
  of(ids: { characterId: string | null; factionId: string | null }): ItemHolder {
    if (ids.characterId) return { kind: 'character', id: ids.characterId };
    if (ids.factionId) return { kind: 'faction', id: ids.factionId };
    throw new ValidationError('An item needs a character or a faction', 'err-item-holder-required');
  },

  ids(holder: ItemHolder): { characterId: string | null; factionId: string | null } {
    return holder.kind === 'character' ? { characterId: holder.id, factionId: null } : { characterId: null, factionId: holder.id };
  },

  equals(a: ItemHolder | null | undefined, b: ItemHolder | null | undefined): boolean {
    return !!a && !!b && a.kind === b.kind && a.id === b.id;
  },

  validate(holder: ItemHolder | null | undefined): ItemHolder {
    if (!holder || !ITEM_HOLDER_KINDS.includes(holder.kind) || !holder.id) {
      throw new ValidationError('Invalid item holder', 'err-item-holder-required');
    }
    return holder;
  },
};

import type { EquipmentSlot } from '../../../characters/domain/value-objects/character-equipment.vo.js';
import type { CharacterEntry, ExportFile, ItemExport } from '../format/export-format.js';
import type { ImportError } from './import-issues.js';

const HAND_SLOTS: EquipmentSlot[] = ['mainHand', 'offHand'];

/** Whether an item can go in a slot: armor only in the armor slots, never in the hands (the rule of equipping). */
export function fitsSlot(item: ItemExport, slot: EquipmentSlot): boolean {
  if (HAND_SLOTS.includes(slot)) return item.category !== 'armor';
  return item.category === 'armor' && !!item.armor;
}

/** The character entries of a file, with the JSON path of each one. */
export function characterEntries(file: ExportFile): { entry: CharacterEntry; path: string }[] {
  return file.kind === 'character'
    ? [{ entry: file.data, path: 'data' }]
    : file.data.characters.map((entry, index) => ({ entry, path: `data.characters[${index}]` }));
}

/**
 * Coherence of a file that already passed the schema (workspace spec 024, decision 11): every `ref` is unique, every
 * slot points to an item of the same character that can go there and every crafter `ref` is a character of the file.
 */
export function validateConsistency(file: ExportFile): ImportError[] {
  const errors: ImportError[] = [];
  const invalid = (path: string, message: string, id?: string) =>
    errors.push({ code: 'export-invalid-file', message, path, kind: 'ref', ...(id ? { id } : {}) });

  const entries = characterEntries(file);
  const characterRefs = new Set<string>();
  const itemRefs = new Set<string>();
  const checkItemRef = (item: ItemExport, path: string) => {
    if (itemRefs.has(item.ref)) invalid(`${path}.ref`, `Item ref ${item.ref} is repeated`, item.ref);
    itemRefs.add(item.ref);
  };

  for (const { entry, path } of entries) {
    if (characterRefs.has(entry.ref)) invalid(`${path}.ref`, `Character ref ${entry.ref} is repeated`, entry.ref);
    characterRefs.add(entry.ref);
    entry.items.forEach((item, index) => checkItemRef(item, `${path}.items[${index}]`));
  }
  if (file.kind === 'faction') {
    file.data.armory.forEach((item, index) => checkItemRef(item, `data.armory[${index}]`));
  }

  for (const { entry, path } of entries) {
    const own = new Map(entry.items.map(item => [item.ref, item]));
    for (const [slot, ref] of Object.entries(entry.character.equipment.slots)) {
      if (!ref) continue;
      const item = own.get(ref);
      const slotPath = `${path}.character.equipment.slots.${slot}`;
      if (!item) {
        invalid(slotPath, `Slot ${slot} points to ${ref}, which is not an item of this character`, ref);
      } else if (!fitsSlot(item, slot as EquipmentSlot)) {
        errors.push({
          code: 'export-invalid-file',
          message: `Item ${ref} cannot go in slot ${slot}`,
          path: slotPath,
          kind: 'slot',
          id: ref,
        });
      }
    }
  }

  const allItems: { item: ItemExport; path: string }[] = [
    ...entries.flatMap(({ entry, path }) => entry.items.map((item, index) => ({ item, path: `${path}.items[${index}]` }))),
    ...(file.kind === 'faction' ? file.data.armory.map((item, index) => ({ item, path: `data.armory[${index}]` })) : []),
  ];
  for (const { item, path } of allItems) {
    item.modifiers.forEach((modifier, index) => {
      const crafterRef = modifier.source?.crafterRef;
      if (crafterRef && !characterRefs.has(crafterRef)) {
        invalid(`${path}.modifiers[${index}].source.crafterRef`, `Crafter ${crafterRef} is not a character of the file`, crafterRef);
      }
    });
  }
  return errors;
}

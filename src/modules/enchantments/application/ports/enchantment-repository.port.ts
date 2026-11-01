import type { BaseRepository } from '../../../shared/application/ports/base-repository.port.js';
import type { EnchantmentProject } from '../../domain/aggregates/enchantment-project.js';

export interface EnchantmentRepository extends BaseRepository<EnchantmentProject> {
  /** The project that still holds the item (pending failures, in progress or suspended), if any. */
  findActiveByItemId(itemId: string): Promise<EnchantmentProject | null>;
}

export const ENCHANTMENT_REPOSITORY = Symbol('EnchantmentRepository');

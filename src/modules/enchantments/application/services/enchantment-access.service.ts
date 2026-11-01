import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { type HolderContext, HolderAccess } from '../../../items/application/services/holder-access.service.js';
import { QueryCriteria } from '../../../shared/application/criteria/query-criteria.js';
import { NotFoundError } from '../../../shared/domain/errors/errors.js';
import type { EnchantmentProject } from '../../domain/aggregates/enchantment-project.js';
import { ENCHANTMENT_REPOSITORY, type EnchantmentRepository } from '../ports/enchantment-repository.port.js';

/**
 * Who may see and run an enchantment project (workspace spec 064):
 * - read: whoever can read its game, its owner and the owner of the alchemist;
 * - act on it: whoever manages the alchemist (its owner, the owner of the game or an admin, HolderAccess).
 */
@Injectable()
export class EnchantmentAccess {
  constructor(
    @Inject(ENCHANTMENT_REPOSITORY) private readonly repository: EnchantmentRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly holderAccess: HolderAccess,
    private readonly gameAccess: GameAccess,
  ) {}

  async find(id: string): Promise<EnchantmentProject> {
    const project = await this.repository.findById(id);
    if (!project) throw new NotFoundError('EnchantmentProject', id, 'err-enchantment-not-found');
    return project;
  }

  /** The project, when the user manages its alchemist; the context of the alchemist goes with it. */
  async findManaged(id: string, userId: string, roles: string[]): Promise<{ project: EnchantmentProject; alchemist: HolderContext }> {
    const project = await this.find(id);
    const alchemist = await this.holderAccess.load({ kind: 'character', id: project.alchemistId });
    await this.holderAccess.checkManage(alchemist, userId, roles);
    return { project, alchemist };
  }

  async checkRead(project: EnchantmentProject, userId: string, roles: string[]): Promise<void> {
    if (GameAccess.readsAll(roles) || project.owner === userId) return;
    const alchemist = await this.characterRepository.findById(project.alchemistId);
    if (alchemist?.owner === userId) return;
    await this.gameAccess.checkRead(await this.gameAccess.findGame(project.gameId), userId, roles, 'this enchantment project');
  }

  /** The projects a user can read: of the games they can read, their own, and those of their characters. */
  async readFilter(userId: string, roles: string[]): Promise<QueryCriteria> {
    if (GameAccess.readsAll(roles)) return QueryCriteria.empty();
    const [inGamesOrOwned, characterIds] = await Promise.all([
      this.gameAccess.childrenFilter(userId, roles, true),
      this.characterRepository.findIdsByOwner(userId),
    ]);
    return QueryCriteria.anyOf([inGamesOrOwned, QueryCriteria.in('alchemistId', characterIds)]);
  }
}

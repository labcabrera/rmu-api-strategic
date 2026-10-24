import { CharacterAccess } from '../../services/character-access.service.js';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import type { HealingLogEntry } from '../../../domain/value-objects/healing-log-entry.vo.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type HealingLogRepository, HEALING_LOG_REPOSITORY } from '../../ports/healing-log-repository.port.js';
import { GetHealingLogQuery } from '../queries/get-healing-log.query.js';

@QueryHandler(GetHealingLogQuery)
export class GetHealingLogHandler implements IQueryHandler<GetHealingLogQuery, Page<HealingLogEntry>> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(HEALING_LOG_REPOSITORY) private readonly healingLogRepository: HealingLogRepository,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(query: GetHealingLogQuery): Promise<Page<HealingLogEntry>> {
    // Same read access as the character itself
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId, 'err-character-not-found');
    await this.characterAccess.checkRead(character, query.userId, query.roles);
    return this.healingLogRepository.findByCharacterId(query.characterId, query.page, query.size);
  }
}

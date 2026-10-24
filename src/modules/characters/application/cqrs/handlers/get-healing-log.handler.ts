import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { HealingLogEntry } from '../../../domain/value-objects/healing-log-entry.vo';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port';
import { type HealingLogRepository, HEALING_LOG_REPOSITORY } from '../../ports/healing-log-repository.port';
import { GetHealingLogQuery } from '../queries/get-healing-log.query';

@QueryHandler(GetHealingLogQuery)
export class GetHealingLogHandler implements IQueryHandler<GetHealingLogQuery, Page<HealingLogEntry>> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(HEALING_LOG_REPOSITORY) private readonly healingLogRepository: HealingLogRepository,
  ) {}

  async execute(query: GetHealingLogQuery): Promise<Page<HealingLogEntry>> {
    // Same read access as the character itself
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId, 'err-character-not-found');
    return this.healingLogRepository.findByCharacterId(query.characterId, query.page, query.size);
  }
}

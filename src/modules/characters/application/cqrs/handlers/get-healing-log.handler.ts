import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from 'src/modules/shared/domain/entities/page';
import { NotFoundError } from 'src/modules/shared/domain/errors/errors';
import { HealingLogEntry } from '../../../domain/value-objects/healing-log-entry.vo';
import type { CharacterRepository } from '../../ports/character.repository';
import type { HealingLogRepository } from '../../ports/healing-log.repository';
import { GetHealingLogQuery } from '../queries/get-healing-log.query';

@QueryHandler(GetHealingLogQuery)
export class GetHealingLogHandler implements IQueryHandler<GetHealingLogQuery, Page<HealingLogEntry>> {
  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: CharacterRepository,
    @Inject('HealingLogRepository') private readonly healingLogRepository: HealingLogRepository,
  ) {}

  async execute(query: GetHealingLogQuery): Promise<Page<HealingLogEntry>> {
    // Same read access as the character itself
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId, 'err-character-not-found');
    return this.healingLogRepository.findByCharacterId(query.characterId, query.page, query.size);
  }
}

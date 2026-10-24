import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { InjuryTreatmentRules, type TreatmentDifficulty } from '../../../domain/services/healing/injury-treatment-rules.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../ports/character-repository.port.js';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../../ports/healing-tables-client.port.js';
import { CharacterAccess } from '../../services/character-access.service.js';
import { GetTreatmentDifficultyQuery } from '../queries/get-treatment-difficulty.query.js';

/** Difficulty the server uses for a procedure on an injury when the treatment does not override it (spec 022). */
@QueryHandler(GetTreatmentDifficultyQuery)
export class GetTreatmentDifficultyHandler implements IQueryHandler<GetTreatmentDifficultyQuery, TreatmentDifficulty> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
    private readonly characterAccess: CharacterAccess,
  ) {}

  async execute(query: GetTreatmentDifficultyQuery): Promise<TreatmentDifficulty> {
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId, 'err-character-not-found');
    await this.characterAccess.checkRead(character, query.userId, query.roles);
    const injury = character.findInjury(query.injuryId);
    return InjuryTreatmentRules.difficulty(query.procedure, injury, await this.healingTablesClient.getHealingTables());
  }
}

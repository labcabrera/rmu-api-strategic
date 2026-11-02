import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../../characters/application/ports/character-repository.port.js';
import { CharacterAccess } from '../../../../characters/application/services/character-access.service.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../../factions/application/ports/faction-repository.port.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/errors.js';
import type { CharacterFile } from '../../../domain/format/export-format.js';
import { type BuiltExport, ExportBuilder } from '../../services/export-builder.service.js';
import { ExportCharacterQuery } from '../queries/export-character.query.js';

/** Workspace spec 024, decision 13: the owner of the character, the owner of its game or an admin. */
@QueryHandler(ExportCharacterQuery)
export class ExportCharacterHandler implements IQueryHandler<ExportCharacterQuery, BuiltExport<CharacterFile>> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly builder: ExportBuilder,
  ) {}

  async execute(query: ExportCharacterQuery): Promise<BuiltExport<CharacterFile>> {
    const character = await this.characterRepository.findById(query.characterId);
    if (!character) throw new NotFoundError('Character', query.characterId, 'err-character-not-found');
    if (!(await this.characterAccess.canChange(character, query.userId, query.roles))) {
      throw new ForbiddenError('You do not have permission to export this character');
    }
    const faction = await this.factionRepository.findById(character.faction.id);
    if (!faction) throw new NotFoundError('Faction', character.faction.id, 'err-faction-not-found');
    return this.builder.characterFile(character, faction);
  }
}

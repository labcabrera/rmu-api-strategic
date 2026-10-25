import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../../factions/application/ports/faction-repository.port.js';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import type { FactionFile } from '../../../domain/format/export-format.js';
import { type BuiltExport, ExportBuilder } from '../../services/export-builder.service.js';
import { ExportFactionQuery } from '../queries/export-faction.query.js';

/** Workspace spec 024, decision 13: the owner of the game of the faction or an admin. */
@QueryHandler(ExportFactionQuery)
export class ExportFactionHandler implements IQueryHandler<ExportFactionQuery, BuiltExport<FactionFile>> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly gameAccess: GameAccess,
    private readonly builder: ExportBuilder,
  ) {}

  async execute(query: ExportFactionQuery): Promise<BuiltExport<FactionFile>> {
    const faction = await this.factionRepository.findById(query.factionId);
    if (!faction) throw new NotFoundError('Faction', query.factionId, 'err-faction-not-found');
    const game = await this.gameAccess.findGame(faction.gameId);
    this.gameAccess.checkManage(game, query.userId, query.roles, 'the export of this faction');
    return this.builder.factionFile(faction);
  }
}

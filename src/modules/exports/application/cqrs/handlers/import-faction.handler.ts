import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type ImportPreview, type ImportResult, ImportService } from '../../services/import.service.js';
import { ImportFactionCommand } from '../commands/import-faction.command.js';

/** Workspace spec 024, decision 13: whoever can create a faction in the game (its owner or an admin). */
@CommandHandler(ImportFactionCommand)
export class ImportFactionHandler implements ICommandHandler<ImportFactionCommand, ImportPreview | ImportResult> {
  constructor(
    private readonly gameAccess: GameAccess,
    private readonly imports: ImportService,
  ) {}

  async execute(command: ImportFactionCommand): Promise<ImportPreview | ImportResult> {
    GameAccess.checkCreateRole(command.roles, 'factions');
    const game = await this.gameAccess.findGame(command.gameId);
    if (!game) throw new NotFoundError('Game', command.gameId, 'err-game-not-found');
    this.gameAccess.checkManage(game, command.userId, command.roles, 'the factions of this game');
    const prepared = await this.imports.prepare(command.file, { target: 'faction', game }, command.userId);
    if (command.dryRun) return prepared.preview;
    return this.imports.write(prepared, command.userId, command.fileName);
  }
}

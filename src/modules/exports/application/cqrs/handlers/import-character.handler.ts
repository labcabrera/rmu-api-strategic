import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CharacterAccess } from '../../../../characters/application/services/character-access.service.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../../factions/application/ports/faction-repository.port.js';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type ImportPreview, type ImportResult, ImportService } from '../../services/import.service.js';
import { ImportCharacterCommand } from '../commands/import-character.command.js';

/** Workspace spec 024, decision 13: whoever can create a character in the faction (rmu-user or rmu-admin). */
@CommandHandler(ImportCharacterCommand)
export class ImportCharacterHandler implements ICommandHandler<ImportCharacterCommand, ImportPreview | ImportResult> {
  constructor(
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly gameAccess: GameAccess,
    private readonly imports: ImportService,
  ) {}

  async execute(command: ImportCharacterCommand): Promise<ImportPreview | ImportResult> {
    this.characterAccess.checkCreate(command.roles);
    const faction = await this.factionRepository.findById(command.factionId);
    if (!faction) throw new NotFoundError('Faction', command.factionId, 'err-faction-not-found');
    const game = await this.gameAccess.findGame(faction.gameId);
    if (!game) throw new NotFoundError('Game', faction.gameId, 'err-game-not-found');
    const prepared = await this.imports.prepare(
      command.file,
      { target: 'character', game, faction, characterRef: command.characterRef },
      command.userId,
    );
    if (command.dryRun) return prepared.preview;
    return this.imports.write(prepared, command.userId, command.fileName);
  }
}

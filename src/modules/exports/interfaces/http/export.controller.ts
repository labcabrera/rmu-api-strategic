import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import { ImportCharacterCommand } from '../../application/cqrs/commands/import-character.command.js';
import { ImportFactionCommand } from '../../application/cqrs/commands/import-faction.command.js';
import { ExportCharacterQuery } from '../../application/cqrs/queries/export-character.query.js';
import { ExportFactionQuery } from '../../application/cqrs/queries/export-faction.query.js';
import type { BuiltExport } from '../../application/services/export-builder.service.js';
import type { ImportPreview, ImportResult } from '../../application/services/import.service.js';
import type { ExportFile } from '../../domain/format/export-format.js';
import { CharacterImportQueryDto, ImportPreviewDto, ImportQueryDto, ImportResultDto } from './dto/import.dto.js';

const FILE_NAME_HEADER = 'x-rmu-file-name';

const EXPORT_FILE_DOC = {
  description: 'An export file (`*.rmu.json`): format `rmu-strategic-export`, see the README of rmu-api-strategic',
  schema: { type: 'object', additionalProperties: true },
};

/**
 * Export and import of characters and factions (workspace spec 024). The file is JSON: GET answers it as an
 * attachment, and POST takes it as the body, with `?dryRun=true` for the preview.
 */
@UseGuards(JwtAuthGuard)
@Controller('v1')
@ApiTags('Export and import')
@ApiExtraModels(ImportPreviewDto, ImportResultDto)
export class ExportController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('characters/:id/export')
  @ApiOperation({ operationId: 'exportCharacter', summary: 'Export a character with its items to a file' })
  @ApiOkResponse(EXPORT_FILE_DOC)
  @ApiErrors({ 403: 'Not the owner of the character, the owner of its game or an admin', 404: 'Character not found' })
  async exportCharacter(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const built = await this.queryBus.execute<ExportCharacterQuery, BuiltExport<ExportFile>>(
      new ExportCharacterQuery(id, user.id, user.roles),
    );
    return attachment(res, built);
  }

  @Get('factions/:id/export')
  @ApiOperation({ operationId: 'exportFaction', summary: 'Export a faction with its armory, gold and characters to a file' })
  @ApiOkResponse(EXPORT_FILE_DOC)
  @ApiErrors({ 403: 'Not the owner of the game or an admin', 404: 'Faction not found' })
  async exportFaction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const built = await this.queryBus.execute<ExportFactionQuery, BuiltExport<ExportFile>>(new ExportFactionQuery(id, user.id, user.roles));
    return attachment(res, built);
  }

  @Post('factions/:id/character-imports')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'importCharacter',
    summary: 'Import a character into a faction, from a character file or one character of a faction file',
  })
  @ApiBody(EXPORT_FILE_DOC)
  @ApiHeader({ name: FILE_NAME_HEADER, required: false, description: 'Name of the file, kept in the item ledger' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  @ApiQuery({ name: 'characterRef', required: false, type: String })
  @ApiOkResponse({
    description: 'The preview (dryRun) or the result',
    schema: { oneOf: [{ $ref: getSchemaPath(ImportPreviewDto) }, { $ref: getSchemaPath(ImportResultDto) }] },
  })
  @ApiErrors({
    400: 'Invalid file (export-invalid-file)',
    403: 'Not allowed to create characters',
    404: 'Faction not found',
    413: 'File too large (export-too-large)',
    422: 'Newer or unknown format, missing references or no character chosen',
  })
  async importCharacter(
    @Param('id') id: string,
    @Query() query: CharacterImportQueryDto,
    @Body() file: unknown,
    @Headers(FILE_NAME_HEADER) fileName: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new ImportCharacterCommand(id, file, query.characterRef, !!query.dryRun, fileName, user.id, user.roles);
    return toDto(await this.commandBus.execute<ImportCharacterCommand, ImportPreview | ImportResult>(command), !!query.dryRun);
  }

  @Post('strategic-games/:id/faction-imports')
  @HttpCode(200)
  @ApiOperation({ operationId: 'importFaction', summary: 'Import a faction with its armory and characters into a strategic game' })
  @ApiBody(EXPORT_FILE_DOC)
  @ApiHeader({ name: FILE_NAME_HEADER, required: false, description: 'Name of the file, kept in the item ledger' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  @ApiOkResponse({
    description: 'The preview (dryRun) or the result',
    schema: { oneOf: [{ $ref: getSchemaPath(ImportPreviewDto) }, { $ref: getSchemaPath(ImportResultDto) }] },
  })
  @ApiErrors({
    400: 'Invalid file (export-invalid-file)',
    403: 'Not the owner of the game or an admin',
    404: 'Game not found',
    413: 'File too large (export-too-large)',
    422: 'Not a faction file, newer or unknown format, or missing references',
  })
  async importFaction(
    @Param('id') id: string,
    @Query() query: ImportQueryDto,
    @Body() file: unknown,
    @Headers(FILE_NAME_HEADER) fileName: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new ImportFactionCommand(id, file, !!query.dryRun, fileName, user.id, user.roles);
    return toDto(await this.commandBus.execute<ImportFactionCommand, ImportPreview | ImportResult>(command), !!query.dryRun);
  }
}

function attachment(res: Response, built: BuiltExport<ExportFile>): ExportFile {
  res.setHeader('Content-Disposition', `attachment; filename="${built.fileName}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  return built.file;
}

function toDto(result: ImportPreview | ImportResult, dryRun: boolean): ImportPreviewDto | ImportResultDto {
  return dryRun ? ImportPreviewDto.from(result as ImportPreview) : ImportResultDto.from(result as ImportResult);
}

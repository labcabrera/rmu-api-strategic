import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Page } from '../../../shared/application/pagination/page.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import {
  CreateChronicleChapterCommand,
  DeleteChronicleChapterCommand,
  ReorderChronicleChaptersCommand,
  UpdateChronicleChapterCommand,
} from '../../application/cqrs/commands/chronicle-chapter.commands.js';
import { GetChronicleChapterQuery, GetChronicleChaptersQuery } from '../../application/cqrs/queries/chronicle-chapter.queries.js';
import type { ChronicleChapter, ChronicleChapterSummary } from '../../domain/aggregates/chronicle-chapter.js';
import { MAX_CHRONICLE_CHAPTERS } from '../../domain/value-objects/chronicle-chapter-visibility.vo.js';
import { CreateChronicleChapterDto, ReorderChronicleChaptersDto, UpdateChronicleChapterDto } from './dto/chronicle-chapter-input.dto.js';
import { ChronicleChapterQueryDto } from './dto/chronicle-chapter-query.dto.js';
import { ChronicleChapterDto, ChronicleChapterPageDto, ChronicleChapterSummaryDto } from './dto/chronicle-chapter.dto.js';

/**
 * The chronicle of a strategic game (workspace spec 102): chapters in Markdown that the members read and the masters
 * write. A private chapter is a 404 `chapter-not-found` for anyone below master.
 */
@UseGuards(JwtAuthGuard)
@Controller('v1/chronicle-chapters')
@ApiTags('Chronicle')
export class ChronicleChapterController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('')
  @ApiOperation({
    operationId: 'findChronicleChapters',
    summary: 'The chapters of the chronicle of a game (q=gameId==<id>), without content, sorted by order',
  })
  @ApiOkResponse({ type: ChronicleChapterPageDto })
  @ApiErrors({ 400: 'q without gameId==, or invalid RSQL', 403: 'Not a member of the game', 404: 'Game not found' })
  async find(@Query() dto: ChronicleChapterQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const gameId = ChronicleChapterQueryDto.gameIdOf(dto.q);
    return this.list(new GetChronicleChaptersQuery(gameId, dto.q, dto.page, dto.size, user.id, user.roles));
  }

  @Get(':id')
  @ApiOperation({ operationId: 'findChronicleChapterById', summary: 'A chapter with its Markdown content' })
  @ApiOkResponse({ type: ChronicleChapterDto })
  @ApiErrors({ 403: 'Not a member of the game', 404: 'chapter-not-found (also a private chapter below master)' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const chapter = await this.queryBus.execute<GetChronicleChapterQuery, ChronicleChapter>(
      new GetChronicleChapterQuery(id, user.id, user.roles),
    );
    return ChronicleChapterDto.fromEntity(chapter);
  }

  @Post('')
  @ApiOperation({ operationId: 'createChronicleChapter', summary: 'A new chapter at the end of the chronicle (masters)' })
  @ApiCreatedResponse({ type: ChronicleChapterDto })
  @ApiErrors({
    400: 'Invalid data, or chapter-content-too-long',
    403: 'Not a master of the game',
    404: 'Game not found',
    409: 'chronicle-chapter-limit',
  })
  async create(@Body() dto: CreateChronicleChapterDto, @CurrentUser() user: AuthenticatedUser) {
    const chapter = await this.commandBus.execute<CreateChronicleChapterCommand, ChronicleChapter>(
      CreateChronicleChapterDto.toCommand(dto, user.id, user.roles),
    );
    return ChronicleChapterDto.fromEntity(chapter);
  }

  // Before :id, although the methods differ, to keep the fixed path first.
  @Put('order')
  @ApiOperation({ operationId: 'reorderChronicleChapters', summary: 'The whole order of the chronicle (masters); answers the new listing' })
  @ApiOkResponse({ type: ChronicleChapterPageDto })
  @ApiErrors({ 400: 'chronicle-order-invalid: ids missing, extra or repeated', 403: 'Not a master of the game', 404: 'Game not found' })
  async reorder(@Body() dto: ReorderChronicleChaptersDto, @CurrentUser() user: AuthenticatedUser) {
    await this.commandBus.execute<ReorderChronicleChaptersCommand, void>(ReorderChronicleChaptersDto.toCommand(dto, user.id, user.roles));
    return this.list(new GetChronicleChaptersQuery(dto.gameId, undefined, 0, MAX_CHRONICLE_CHAPTERS, user.id, user.roles));
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateChronicleChapter', summary: 'Title, content, visibility or campaign date of a chapter (masters)' })
  @ApiOkResponse({ type: ChronicleChapterDto })
  @ApiErrors({
    400: 'Invalid data, or chapter-content-too-long',
    403: 'Not a master of the game',
    404: 'chapter-not-found',
    409: 'version-conflict',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateChronicleChapterDto, @CurrentUser() user: AuthenticatedUser) {
    const chapter = await this.commandBus.execute<UpdateChronicleChapterCommand, ChronicleChapter>(
      UpdateChronicleChapterDto.toCommand(id, dto, user.id, user.roles),
    );
    return ChronicleChapterDto.fromEntity(chapter);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteChronicleChapter', summary: 'Delete a chapter (masters); its images stay in the chronicle' })
  @ApiNoContentResponse()
  @ApiErrors({ 403: 'Not a master of the game', 404: 'chapter-not-found' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.commandBus.execute(new DeleteChronicleChapterCommand(id, user.id, user.roles));
  }

  private async list(query: GetChronicleChaptersQuery): Promise<Page<ChronicleChapterSummaryDto>> {
    const page = await this.queryBus.execute<GetChronicleChaptersQuery, Page<ChronicleChapterSummary>>(query);
    const content = page.content.map(summary => ChronicleChapterSummaryDto.fromSummary(summary));
    return new Page(content, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }
}

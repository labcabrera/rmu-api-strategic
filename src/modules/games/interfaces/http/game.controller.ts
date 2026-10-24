import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { GameDto, GamePageDto } from './dto/game.dto.js';
import { GetGameQuery } from '../../application/cqrs/queries/get-game.query.js';
import { Game } from '../../domain/aggregates/game.js';
import { GetGamesQuery } from '../../application/cqrs/queries/get-games.query.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';
import { CreateGameCommand } from '../../application/cqrs/commands/create-game.command.js';
import { DeleteGameCommand } from '../../application/cqrs/commands/delete-game.command.js';
import { UpdateGameCommand } from '../../application/cqrs/commands/update-game.command.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/strategic-games')
@ApiTags('Games')
export class GameController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findGameById', summary: 'Find game by id' })
  @ApiOkResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetGameQuery(id, userId, roles);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    return GameDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findGames', summary: 'Find games by RSQL' })
  @ApiOkResponse({ type: GamePageDto })
  @ApiErrors({ 400: 'Invalid RSQL query' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetGamesQuery(dto.q, dto.page, dto.size, userId, roles);
    const page = await this.queryBus.execute<GetGamesQuery, Page<Game>>(query);
    const mapped = page.content.map(game => GameDto.fromEntity(game));
    return new Page<GameDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createGame', summary: 'Create a new game' })
  @ApiCreatedResponse({ type: GameDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() createGameDto: CreateGameDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const command = CreateGameDto.toCommand(createGameDto, userId, roles);
    const game = await this.commandBus.execute<CreateGameCommand, Game>(command);
    return GameDto.fromEntity(game);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game by id' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors({ 404: 'Game not found', 400: 'Bad request, invalid data' })
  async updateGame(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const command = UpdateGameDto.toCommand(id, updateGameDto, userId, roles);
    const game = await this.commandBus.execute<UpdateGameCommand, Game>(command);
    return GameDto.fromEntity(game);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteGame', summary: 'Delete game by id' })
  @ApiErrors({ 404: 'Game not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const command = new DeleteGameCommand(id, userId, roles);
    await this.commandBus.execute(command);
  }
}

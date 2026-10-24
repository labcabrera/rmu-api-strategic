import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt.auth.guard';
import { GameDto, GamePageDto } from './dtos/game.dto';
import { GetGameQuery } from '../../application/cqrs/queries/get-game.query';
import { Game } from '../../domain/aggregates/game.aggregate';
import { GetGamesQuery } from '../../application/cqrs/queries/get-games.query';
import { CreateGameDto } from './dtos/create-game.dto';
import { UpdateGameDto } from './dtos/update-game.dto';
import { CreateGameCommand } from '../../application/cqrs/commands/create-game.command';
import { DeleteGameCommand } from '../../application/cqrs/commands/delete-game.command';
import { UpdateGameCommand } from '../../application/cqrs/commands/update-game.command';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query';
import { ErrorDto } from '../../../shared/interfaces/http/dto/error-dto';
import { Page } from '../../../shared/domain/entities/page';
import type { AuthenticatedRequest } from '../../../shared/interfaces/http/authenticated-request';

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
  @ApiNotFoundResponse({ description: 'Game not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const roles = req.user.roles;
    const query = new GetGameQuery(id, userId, roles);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    return GameDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findGames', summary: 'Find games by RSQL' })
  @ApiOkResponse({ type: GamePageDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Invalid RSQL query', type: ErrorDto })
  async find(@Query() dto: PagedQueryDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const roles = req.user.roles;
    const query = new GetGamesQuery(dto.q, dto.page, dto.size, userId, roles);
    const page = await this.queryBus.execute<GetGamesQuery, Page<Game>>(query);
    const mapped = page.content.map(game => GameDto.fromEntity(game));
    return new Page<GameDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createGame', summary: 'Create a new game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async create(@Body() createGameDto: CreateGameDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const roles = req.user.roles;
    const command = CreateGameDto.toCommand(createGameDto, userId, roles);
    const game = await this.commandBus.execute<CreateGameCommand, Game>(command);
    return GameDto.fromEntity(game);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game by id' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Game not found', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateGame(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const roles = req.user.roles;
    const command = UpdateGameDto.toCommand(id, updateGameDto, userId, roles);
    const game = await this.commandBus.execute<UpdateGameCommand, Game>(command);
    return GameDto.fromEntity(game);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteGame', summary: 'Delete game by id' })
  @ApiNotFoundResponse({ description: 'Game not found', type: ErrorDto })
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const roles = req.user.roles;
    const command = new DeleteGameCommand(id, userId, roles);
    await this.commandBus.execute(command);
  }
}

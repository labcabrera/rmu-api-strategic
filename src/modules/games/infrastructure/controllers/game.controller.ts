/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { GameDto, GamePageDto } from './dtos/game.dto';
import { Page } from 'src/modules/shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from 'src/modules/shared/infrastructure/controller/dto';
import { GetGameQuery } from '../../application/queries/get-game.query';
import { Game } from '../../domain/entities/game';
import { GetGamesQuery } from '../../application/queries/get-games.query';
import { UpdateGameCommand } from '../../application/commands/update-game.command';
import { DeleteGameCommand } from '../../application/commands/delete-game.command';
import { CreateGameDto } from './dtos/create-game.dto';
import { CreateGameCommand } from '../../application/commands/create-game.command';

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
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetGameQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    return GameDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findGames', summary: 'Find games by RSQL' })
  @ApiOkResponse({ type: GamePageDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Invalid RSQL query', type: ErrorDto })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    const user = req.user!;
    const query = new GetGamesQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetGamesQuery, Page<Game>>(query);
    const mapped = page.content.map((game) => GameDto.fromEntity(game));
    return new Page<GameDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createGame', summary: 'Create a new game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  create(@Body() createGameDto: CreateGameDto, @Request() req) {
    const user = req.user!;
    const command = CreateGameDto.toCommand(createGameDto, user.id as string, user.roles as string[]);
    return this.commandBus.execute<CreateGameCommand, Game>(command);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game by id' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Game not found', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  updateSettings(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command: UpdateGameCommand = {
      ...req.body,
      id: id,
      userId: user.id as string,
      roles: user.roles as string[],
    };
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteGame', summary: 'Delete game by id' })
  @ApiNotFoundResponse({ description: 'Game not found', type: ErrorDto })
  async delete(@Param('id') id: string, @Request() req) {
    const command = new DeleteGameCommand(id, undefined, req.user!.id as string, req.user!.roles as string[]);
    await this.commandBus.execute(command);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { GameDto, GameMembersDto, GamePageDto } from './dto/game.dto.js';
import { GameAccess } from '../../application/services/game-access.service.js';
import { GameRealmService } from '../../application/services/game-realm.service.js';
import { gameAccessAtLeast } from '../../domain/value-objects/game-member.vo.js';
import { JoinGameDto, SetGameMemberDto } from './dto/game-members.dto.js';
import {
  ApproveJoinRequestCommand,
  RemoveGameMemberCommand,
  RemoveJoinRequestCommand,
  RequestJoinGameCommand,
  SetGameMemberCommand,
} from '../../application/cqrs/commands/game-members.commands.js';
import { GetGameMembersQuery } from '../../application/cqrs/queries/game-members.queries.js';
import type { GameMembersView } from '../../application/cqrs/handlers/game-members.handlers.js';
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
import { GetGameTimeLogQuery } from '../../application/cqrs/queries/get-game-time-log.query.js';
import type { GameTimeLogEntry } from '../../domain/value-objects/game-time-log-entry.vo.js';
import { GameTimeLogEntryDto, GameTimeLogPageDto } from './dto/game-time-log.dto.js';
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
    private readonly gameAccess: GameAccess,
    private readonly gameRealm: GameRealmService,
  ) {}

  private toDto(game: Game, user: AuthenticatedUser, realmReadable?: boolean): GameDto {
    return GameDto.fromEntity(game, this.gameAccess.level(game, user.id, user.roles), realmReadable);
  }

  /** `me` is the current user. */
  private static memberId(userId: string, user: AuthenticatedUser): string {
    return userId === 'me' ? user.id : userId;
  }

  @Get(':id')
  @ApiOperation({ operationId: 'findGameById', summary: 'Find game by id' })
  @ApiOkResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetGameQuery(id, userId, roles);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    const access = this.gameAccess.level(entity, userId, roles);
    // The masters learn when the owner no longer reads the realm (spec 071, decision 3).
    const realmReadable = gameAccessAtLeast(access, 'master')
      ? await this.gameRealm.isReadable(entity.realmId, entity.owner, [])
      : undefined;
    return GameDto.fromEntity(entity, access, realmReadable);
  }

  @Get(':id/time-log')
  @ApiOperation({ operationId: 'getGameTimeLog', summary: 'Time log of the campaign, newest first (spec 065)' })
  @ApiOkResponse({ type: GameTimeLogPageDto })
  @ApiErrors({ 404: 'Game not found' })
  async getTimeLog(@Param('id') id: string, @Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetGameTimeLogQuery(id, dto.page, dto.size, user.id, user.roles);
    const page = await this.queryBus.execute<GetGameTimeLogQuery, Page<GameTimeLogEntry>>(query);
    const content = page.content.map(entry => GameTimeLogEntryDto.fromEntity(entry));
    return new Page<GameTimeLogEntryDto>(content, page.pagination.page, page.pagination.size, page.pagination.totalElements);
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
    const mapped = page.content.map(game => this.toDto(game, user));
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
    return this.toDto(game, user);
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
    return this.toDto(game, user);
  }

  @Get(':id/members')
  @ApiOperation({ operationId: 'getGameMembers', summary: 'Members of the game, and join requests for its masters (spec 071)' })
  @ApiOkResponse({ type: GameMembersDto })
  @ApiErrors({ 404: 'Game not found' })
  async getMembers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<GameMembersView> {
    return this.queryBus.execute<GetGameMembersQuery, GameMembersView>(new GetGameMembersQuery(id, user.id, user.roles));
  }

  @Put(':id/members/:userId')
  @ApiOperation({ operationId: 'setGameMember', summary: 'Add a friend of the owner to the game, or change their role (spec 071)' })
  @ApiOkResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game not found', 400: 'Not a friend of the owner', 409: 'Member limit' })
  async setMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: SetGameMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new SetGameMemberCommand(id, GameController.memberId(userId, user), dto.role, user.id, user.roles);
    return this.toDto(await this.commandBus.execute<SetGameMemberCommand, Game>(command), user);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ operationId: 'removeGameMember', summary: 'Leave the game (me) or expel a member (spec 071)' })
  @ApiOkResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game or member not found' })
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new RemoveGameMemberCommand(id, GameController.memberId(userId, user), user.id, user.roles);
    return this.toDto(await this.commandBus.execute<RemoveGameMemberCommand, Game>(command), user);
  }

  @Post(':id/join-requests')
  @ApiOperation({ operationId: 'requestJoinGame', summary: 'Ask to join a public game (spec 071)' })
  @ApiCreatedResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game not found', 400: 'The game is not public', 409: 'Already a member, or request limit' })
  async requestJoin(@Param('id') id: string, @Body() dto: JoinGameDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new RequestJoinGameCommand(id, dto.message ?? null, user.id, user.roles);
    return this.toDto(await this.commandBus.execute<RequestJoinGameCommand, Game>(command), user);
  }

  @Post(':id/join-requests/:userId/approve')
  @ApiOperation({ operationId: 'approveJoinRequest', summary: 'Approve a join request: the user joins as a player (spec 071)' })
  @ApiCreatedResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game or request not found', 409: 'Member limit' })
  async approveJoin(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new ApproveJoinRequestCommand(id, userId, user.id, user.roles);
    return this.toDto(await this.commandBus.execute<ApproveJoinRequestCommand, Game>(command), user);
  }

  @Delete(':id/join-requests/:userId')
  @ApiOperation({ operationId: 'removeJoinRequest', summary: 'Reject a join request, or take back the own one (me) (spec 071)' })
  @ApiOkResponse({ type: GameDto })
  @ApiErrors({ 404: 'Game not found' })
  async removeJoin(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new RemoveJoinRequestCommand(id, GameController.memberId(userId, user), user.id, user.roles);
    return this.toDto(await this.commandBus.execute<RemoveJoinRequestCommand, Game>(command), user);
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

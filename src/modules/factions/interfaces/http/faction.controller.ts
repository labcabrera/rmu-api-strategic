import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { GetFactionQuery } from '../../application/cqrs/queries/get-faction.query.js';
import { Faction } from '../../domain/aggregates/faction.js';
import { GetFactionsQuery } from '../../application/cqrs/queries/get-factions.query.js';
import { CreateFactionDto } from './dto/create-faction.dto.js';
import { CreateFactionCommand } from '../../application/cqrs/commands/create-faction.command.js';
import { FactionDto, FactionPageDto } from './dto/faction.dto.js';
import { FactionAccess } from '../../application/services/faction-access.service.js';
import { UpdateFactionCommand } from '../../application/cqrs/commands/update-faction.command.js';
import { AddFactionPlayerCommand, RemoveFactionPlayerCommand } from '../../application/cqrs/commands/faction-players.commands.js';
import { UpdateFactionDto } from './dto/update-faction.dto.js';
import { DeleteFactionCommand } from '../../application/cqrs/commands/delete-faction.command.js';
import { AddFactionGoldCommand } from '../../application/cqrs/commands/add-faction-gold.command.js';
import { AddFactionGoldDto } from './dto/add-faction-gold.dto.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/factions')
@ApiTags('Factions')
export class FactionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly factionAccess: FactionAccess,
  ) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findFactionById', summary: 'Find faction by id' })
  @ApiOkResponse({ type: FactionDto })
  @ApiErrors({ 404: 'Faction not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetFactionQuery(id, user.id, user.roles);
    const entity = await this.queryBus.execute<GetFactionQuery, Faction>(query);
    return this.toDto(entity, user);
  }

  @Get('')
  @ApiOperation({ operationId: 'findFactions', summary: 'Find factions by RSQL' })
  @ApiOkResponse({ type: FactionPageDto })
  @ApiErrors({ 400: 'Invalid RSQL query' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetFactionsQuery(dto.q, dto.page, dto.size, user.id, user.roles);
    const page = await this.queryBus.execute<GetFactionsQuery, Page<Faction>>(query);
    const viewer = this.factionAccess.viewer(user.id, user.roles);
    const mapped = await Promise.all(
      page.content.map(async faction => FactionDto.forAccess(faction, await viewer.faction(faction), await viewer.game(faction.gameId))),
    );
    return new Page<FactionDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createFaction', summary: 'Create a new faction' })
  @ApiCreatedResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() createFactionDto: CreateFactionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = CreateFactionDto.toCommand(createFactionDto, user.id, user.roles);
    const faction = await this.commandBus.execute<CreateFactionCommand, Faction>(command);
    return this.toDto(faction, user);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateFaction', summary: 'Update faction by id' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 404: 'Faction not found', 400: 'Bad request, invalid data' })
  async updateFaction(@Param('id') id: string, @Body() updateFactionDto: UpdateFactionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = UpdateFactionDto.toCommand(id, updateFactionDto, user.id, user.roles);
    const faction = await this.commandBus.execute<UpdateFactionCommand, Faction>(command);
    return this.toDto(faction, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteFaction', summary: 'Delete faction by id' })
  @ApiErrors({ 404: 'Faction not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DeleteFactionCommand(id, undefined, user.id, user.roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/add-gold')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addFactionGold', summary: 'Add gold to faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 403: 'Forbidden, insufficient permissions', 400: 'Bad request, invalid data' })
  async addGold(@Param('id') id: string, @Body() addFactionGoldDto: AddFactionGoldDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddFactionGoldDto.toCommand(id, addFactionGoldDto, user.id, user.roles);
    const faction = await this.commandBus.execute<AddFactionGoldCommand, Faction>(command);
    return this.toDto(faction, user);
  }

  @Put(':id/players/:userId')
  @ApiOperation({
    operationId: 'addFactionPlayer',
    summary: 'Spec 072: a master adds a player of the game; a player of the faction adds a friend (who joins the game)',
  })
  @ApiOkResponse({ type: FactionDto })
  @ApiErrors({ 400: 'Not a player of the game, or not a friend', 403: 'Not a player of the faction', 404: 'Faction not found' })
  async addPlayer(@Param('id') id: string, @Param('userId') playerId: string, @CurrentUser() user: AuthenticatedUser) {
    const faction = await this.commandBus.execute<AddFactionPlayerCommand, Faction>(
      new AddFactionPlayerCommand(id, playerId, user.id, user.roles),
    );
    return this.toDto(faction, user);
  }

  @Delete(':id/players/:userId')
  @ApiOperation({ operationId: 'removeFactionPlayer', summary: 'Spec 072: a master takes a player out; `me` leaves the faction' })
  @ApiOkResponse({ type: FactionDto })
  @ApiErrors({ 403: 'Only the masters take other players out', 404: 'Faction or player not found' })
  async removePlayer(@Param('id') id: string, @Param('userId') playerId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new RemoveFactionPlayerCommand(id, playerId === 'me' ? user.id : playerId, user.id, user.roles);
    const faction = await this.commandBus.execute<RemoveFactionPlayerCommand, Faction>(command);
    return this.toDto(faction, user);
  }

  /** The faction with the names of its players and the access of the user (spec 072, contract 18). */
  private async toDto(faction: Faction, user: AuthenticatedUser): Promise<FactionDto> {
    const viewer = this.factionAccess.viewer(user.id, user.roles);
    return FactionDto.forAccess(faction, await viewer.faction(faction), await viewer.game(faction.gameId));
  }
}

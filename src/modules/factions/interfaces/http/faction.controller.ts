import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { GetFactionQuery } from '../../application/cqrs/queries/get-faction.query.js';
import { Faction } from '../../domain/aggregates/faction.js';
import { GetFactionsQuery } from '../../application/cqrs/queries/get-factions.query.js';
import { CreateFactionDto } from './dto/create-faction.dto.js';
import { CreateFactionCommand } from '../../application/cqrs/commands/create-faction.command.js';
import { FactionDto, FactionPageDto } from './dto/faction.dto.js';
import { UpdateFactionCommand } from '../../application/cqrs/commands/update-faction.command.js';
import { UpdateFactionDto } from './dto/update-faction.dto.js';
import { DeleteFactionCommand } from '../../application/cqrs/commands/delete-faction.command.js';
import { AddFactionXPDto } from './dto/add-faction-xp.dto.js';
import { AddFactionXPCommand } from '../../application/cqrs/commands/add-faction-xp.command.js';
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
  ) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findFactionById', summary: 'Find faction by id' })
  @ApiOkResponse({ type: FactionDto })
  @ApiErrors({ 404: 'Faction not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetFactionQuery(id, user.id, user.roles);
    const entity = await this.queryBus.execute<GetFactionQuery, Faction>(query);
    return FactionDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findFactions', summary: 'Find factions by RSQL' })
  @ApiOkResponse({ type: FactionPageDto })
  @ApiErrors({ 400: 'Invalid RSQL query' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetFactionsQuery(dto.q, dto.page, dto.size, user.id, user.roles);
    const page = await this.queryBus.execute<GetFactionsQuery, Page<Faction>>(query);
    const mapped = page.content.map(faction => FactionDto.fromEntity(faction));
    return new Page<FactionDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createFaction', summary: 'Create a new faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() createFactionDto: CreateFactionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = CreateFactionDto.toCommand(createFactionDto, user.id, user.roles);
    const faction = await this.commandBus.execute<CreateFactionCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateFaction', summary: 'Update faction by id' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 404: 'Faction not found', 400: 'Bad request, invalid data' })
  async updateFaction(@Param('id') id: string, @Body() updateFactionDto: UpdateFactionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = UpdateFactionDto.toCommand(id, updateFactionDto, user.id, user.roles);
    const faction = await this.commandBus.execute<UpdateFactionCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteFaction', summary: 'Delete faction by id' })
  @ApiErrors({ 404: 'Faction not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DeleteFactionCommand(id, undefined, user.id, user.roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/add-xp')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addFactionXP', summary: 'Add XP to faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 403: 'Forbidden, insufficient permissions', 400: 'Bad request, invalid data' })
  async addXP(@Param('id') id: string, @Body() addFactionXPDto: AddFactionXPDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddFactionXPDto.toCommand(id, addFactionXPDto, user.id, user.roles);
    const faction = await this.commandBus.execute<AddFactionXPCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }

  @Post(':id/add-gold')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addFactionGold', summary: 'Add gold to faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiErrors({ 403: 'Forbidden, insufficient permissions', 400: 'Bad request, invalid data' })
  async addGold(@Param('id') id: string, @Body() addFactionGoldDto: AddFactionGoldDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddFactionGoldDto.toCommand(id, addFactionGoldDto, user.id, user.roles);
    const faction = await this.commandBus.execute<AddFactionGoldCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }
}

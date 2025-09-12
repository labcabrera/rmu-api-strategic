/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from 'src/modules/shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from 'src/modules/shared/infrastructure/controller/dto';
import { GetFactionQuery } from '../../application/cqrs/queries/get-faction.query';
import { Faction } from '../../domain/entities/faction.entity';
import { GetFactionsQuery } from '../../application/cqrs/queries/get-factions.query';
import { CreateFactionDto } from './dtos/create-faction.dto';
import { CreateFactionCommand } from '../../application/cqrs/commands/create-faction.command';
import { FactionDto, FactionPageDto } from './dtos/faction.dto';
import { UpdateFactionCommand } from '../../application/cqrs/commands/update-faction.command';
import { UpdateFactionDto } from './dtos/update-faction.dto';
import { DeleteFactionCommand } from '../../application/cqrs/commands/delete-faction.command';
import { AddFactionXPDto } from './dtos/add-faction-xp.dto';
import { AddFactionXPCommand } from '../../application/cqrs/commands/add-faction-xp.command';
import { AddFactionGoldCommand } from '../../application/cqrs/commands/add-faction-gold.command';
import { AddFactionGoldDto } from './dtos/add-faction-gold.dto';

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
  @ApiNotFoundResponse({ description: 'Faction not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetFactionQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetFactionQuery, Faction>(query);
    return FactionDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findFactions', summary: 'Find factions by RSQL' })
  @ApiOkResponse({ type: FactionPageDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Invalid RSQL query', type: ErrorDto })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    const user = req.user!;
    const query = new GetFactionsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetFactionsQuery, Page<Faction>>(query);
    const mapped = page.content.map((faction) => FactionDto.fromEntity(faction));
    return new Page<FactionDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createFaction', summary: 'Create a new faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async create(@Body() createFactionDto: CreateFactionDto, @Request() req) {
    const user = req.user!;
    const command = CreateFactionDto.toCommand(createFactionDto, user.id as string, user.roles as string[]);
    const faction = await this.commandBus.execute<CreateFactionCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateFaction', summary: 'Update faction by id' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Faction not found', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateFaction(@Param('id') id: string, @Body() updateFactionDto: UpdateFactionDto, @Request() req) {
    const user = req.user!;
    const command = UpdateFactionDto.toCommand(id, updateFactionDto, user.id as string, user.roles as string[]);
    const faction = await this.commandBus.execute<UpdateFactionCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteFaction', summary: 'Delete faction by id' })
  @ApiNotFoundResponse({ description: 'Faction not found', type: ErrorDto })
  async delete(@Param('id') id: string, @Request() req) {
    const command = new DeleteFactionCommand(id, undefined, req.user!.id as string, req.user!.roles as string[]);
    await this.commandBus.execute(command);
  }

  @Post(':id/add-xp')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addFactionXP', summary: 'Add XP to faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiForbiddenResponse({ description: 'Forbidden, insufficient permissions', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addXP(@Param('id') id: string, @Body() addFactionXPDto: AddFactionXPDto, @Request() req) {
    const user = req.user!;
    const command = AddFactionXPDto.toCommand(id, addFactionXPDto, user.id as string, user.roles as string[]);
    const faction = await this.commandBus.execute<AddFactionXPCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }

  @Post(':id/add-gold')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addFactionGold', summary: 'Add gold to faction' })
  @ApiOkResponse({ type: FactionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiForbiddenResponse({ description: 'Forbidden, insufficient permissions', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addGold(@Param('id') id: string, @Body() addFactionGoldDto: AddFactionGoldDto, @Request() req) {
    const user = req.user!;
    const command = AddFactionGoldDto.toCommand(id, addFactionGoldDto, user.id as string, user.roles as string[]);
    const faction = await this.commandBus.execute<AddFactionGoldCommand, Faction>(command);
    return FactionDto.fromEntity(faction);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/infrastructure/controller/dto';
import { CreateCharacterCommand } from '../../application/commands/create-character.command';
import { DeleteCharacterCommand } from '../../application/commands/delete-character.command';
import { UpdateCharacterCommand } from '../../application/commands/update-character.command';
import { GetCharacterQuery } from '../../application/queries/get-character.query';
import { GetCharactersQuery } from '../../application/queries/get-characters.query';
import { Character } from '../../domain/entities/character.entity';
import { CharacterDto, CharacterPageDto } from './dto/character.dto';
import { CreateCharacterDto } from './dto/create-character.dto';
import { AddXPDto } from './dto/add-xp.dto';
import { AddXPCommand } from '../../application/commands/add-xp.command';
import { LevelUpCommand } from '../../application/commands/level-up.command';
import * as ar from 'src/modules/shared/infrastructure/controller/auth-request';
import { UpdateCharacterDto } from './dto/update-character-dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Characters')
export class CharacterController {
  private readonly logger = new Logger(CharacterController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findCharacterById', summary: 'Find character by id' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Realm not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req: ar.AuthRequest) {
    const query = new GetCharacterQuery(id, req.user.id, req.user.roles);
    const entity = await this.queryBus.execute<GetCharacterQuery, Character>(query);
    return CharacterDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findCharacters', summary: 'Find characters by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Finding characters with query ${dto.q} for user ${req.user.id}`);
    const query = new GetCharactersQuery(dto.q, dto.page, dto.size, req.user.id, req.user.roles);
    const page = await this.queryBus.execute<GetCharactersQuery, Page<Character>>(query);
    const mapped = page.content.map((character) => CharacterDto.fromEntity(character));
    return new Page<CharacterDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateCharacterDto })
  @ApiOperation({ operationId: 'createCharacter', summary: 'Create a new character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async create(@Body() dto: CreateCharacterDto, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Creating character ${dto.name} for user ${req.user.id}`);
    const command = CreateCharacterDto.toCommand(dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<CreateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateCharacter', summary: 'Update character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateCharacterDto, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Updating character ${id} for user ${req.user.id}`);
    const command = UpdateCharacterDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<UpdateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'deleteCharacter', summary: 'Delete character by id' })
  async delete(@Param('id') id: string, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Deleting character ${id} for user ${req.user.id}`);
    const command = new DeleteCharacterCommand(id, req.user.id, req.user.roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/xp')
  @ApiBody({ type: AddXPDto })
  @ApiOperation({ operationId: 'addXP', summary: 'Add XP to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addXP(@Param('id') id: string, @Body() dto: AddXPDto, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Adding character ${id} XP for user ${req.user.id}`);
    const command = AddXPDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<AddXPCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/xp/level-up')
  @ApiOperation({ operationId: 'levelUp', summary: 'Level up a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async levelUp(@Param('id') id: string, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Leveling up character: ${id} for user ${req.user.id}`);
    const force = req.query.force === 'true';
    const command = new LevelUpCommand(id, force, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<LevelUpCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

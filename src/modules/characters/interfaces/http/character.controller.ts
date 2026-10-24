import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { CharacterDto, CharacterPageDto } from './dto/character.dto.js';
import { CreateCharacterDto } from './dto/create-character.dto.js';
import { AddXPDto } from './dto/add-xp.dto.js';
import { UpdateCharacterDto } from './dto/update-character.dto.js';
import { LevelUpQueryDto } from './dto/level-up-query.dto.js';
import { CatalogPagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { AddXPCommand } from '../../application/cqrs/commands/add-xp.command.js';
import { CreateCharacterCommand } from '../../application/cqrs/commands/create-character.command.js';
import { DeleteCharacterCommand } from '../../application/cqrs/commands/delete-character.command.js';
import { LevelUpCommand } from '../../application/cqrs/commands/level-up.command.js';
import { UpdateCharacterCommand } from '../../application/cqrs/commands/update-character.command.js';
import { GetCharacterQuery } from '../../application/cqrs/queries/get-character.query.js';
import { GetCharactersQuery } from '../../application/cqrs/queries/get-characters.query.js';
import { Character } from '../../domain/aggregates/character.js';
import { UpdateTemporaryStatCommand } from '../../application/cqrs/commands/update-temporary-stat.command.js';
import { UpdateTemporaryStatDto } from './dto/update-temporary-stat.dto.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

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
  @ApiErrors({ 404: 'Realm not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetCharacterQuery(id, userId, roles);
    const entity = await this.queryBus.execute<GetCharacterQuery, Character>(query);
    return CharacterDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterPageDto, description: 'Success' })
  @ApiErrors()
  @ApiOperation({ operationId: 'findCharacters', summary: 'Find characters by RSQL' })
  async find(@Query() dto: CatalogPagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Finding characters with query ${dto.q} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const query = new GetCharactersQuery(dto.q, dto.page, dto.size, userId, roles);
    const page = await this.queryBus.execute<GetCharactersQuery, Page<Character>>(query);
    const mapped = page.content.map(character => CharacterDto.fromEntity(character));
    return new Page<CharacterDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateCharacterDto })
  @ApiOperation({ operationId: 'createCharacter', summary: 'Create a new character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() dto: CreateCharacterDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Creating character ${dto.name} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = CreateCharacterDto.toCommand(dto, userId, roles);
    const entity = await this.commandBus.execute<CreateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateCharacter', summary: 'Update character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors()
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateCharacterDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Updating character ${id} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = UpdateCharacterDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<UpdateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiErrors()
  @ApiOperation({ operationId: 'deleteCharacter', summary: 'Delete character by id' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Deleting character ${id} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = new DeleteCharacterCommand(id, userId, roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/xp')
  @HttpCode(200)
  @ApiBody({ type: AddXPDto })
  @ApiOperation({ operationId: 'addXP', summary: 'Add XP to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async addXP(@Param('id') id: string, @Body() dto: AddXPDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Adding character ${id} XP for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = AddXPDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<AddXPCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/level-up')
  @HttpCode(200)
  @ApiOperation({ operationId: 'levelUp', summary: 'Level up a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async levelUp(@Param('id') id: string, @Query() dto: LevelUpQueryDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Leveling up character: ${id} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const force = dto.force || false;
    const command = new LevelUpCommand(id, force, userId, roles);
    const entity = await this.commandBus.execute<LevelUpCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/stats/temporary')
  @HttpCode(200)
  @ApiOperation({ operationId: 'levelUpTemporaryStat', summary: 'Level up temporary stat' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async levelUpTemporaryStat(@Param('id') id: string, @Body() dto: UpdateTemporaryStatDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Leveling up character stat: ${id} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = UpdateTemporaryStatDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<UpdateTemporaryStatCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

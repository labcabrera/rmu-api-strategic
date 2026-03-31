/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { GetCharacterQuery } from '../../application/cqrs/queries/get-character.query';
import { GetCharactersQuery } from '../../application/cqrs/queries/get-characters.query';
import { Character } from '../../domain/aggregates/character.aggregate';
import { CharacterDto, CharacterPageDto } from './dto/character.dto';
import { CreateCharacterDto } from './dto/create-character.dto';
import { AddXPDto } from './dto/add-xp.dto';
import { UpdateCharacterDto } from './dto/update-character-dto';
import { AddXPCommand } from '../../application/cqrs/commands/add-xp.command';
import { CreateCharacterCommand } from '../../application/cqrs/commands/create-character.command';
import { DeleteCharacterCommand } from '../../application/cqrs/commands/delete-character.command';
import { LevelUpCommand } from '../../application/cqrs/commands/level-up.command';
import { UpdateCharacterCommand } from '../../application/cqrs/commands/update-character.command';
import { LevelUpQueryDto } from './dto/level-up-query.dto';
import { ErrorDto } from 'src/modules/shared/interfaces/http/dto/error-dto';
import { PagedQueryDto } from 'src/modules/shared/interfaces/http/dto/paged-rsql-query';
import { Page } from 'src/modules/shared/domain/entities/page';

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
  async findById(@Param('id') id: string, @Request() req) {
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const query = new GetCharacterQuery(id, userId, roles);
    const entity = await this.queryBus.execute<GetCharacterQuery, Character>(query);
    return CharacterDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findCharacters', summary: 'Find characters by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding characters with query ${dto.q} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const query = new GetCharactersQuery(dto.q, dto.page, dto.size, userId, roles);
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
  async create(@Body() dto: CreateCharacterDto, @Request() req) {
    this.logger.debug(`Creating character ${dto.name} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const command = CreateCharacterDto.toCommand(dto, userId, roles);
    const entity = await this.commandBus.execute<CreateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateCharacter', summary: 'Update character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateCharacterDto, @Request() req) {
    this.logger.debug(`Updating character ${id} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const command = UpdateCharacterDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<UpdateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'deleteCharacter', summary: 'Delete character by id' })
  async delete(@Param('id') id: string, @Request() req) {
    this.logger.debug(`Deleting character ${id} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const command = new DeleteCharacterCommand(id, userId, roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/xp')
  @HttpCode(200)
  @ApiBody({ type: AddXPDto })
  @ApiOperation({ operationId: 'addXP', summary: 'Add XP to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addXP(@Param('id') id: string, @Body() dto: AddXPDto, @Request() req) {
    this.logger.debug(`Adding character ${id} XP for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const command = AddXPDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<AddXPCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/level-up')
  @HttpCode(200)
  @ApiOperation({ operationId: 'levelUp', summary: 'Level up a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async levelUp(@Param('id') id: string, @Query() dto: LevelUpQueryDto, @Request() req) {
    this.logger.debug(`Leveling up character: ${id} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const force = dto.force || false;
    const command = new LevelUpCommand(id, force, userId, roles);
    const entity = await this.commandBus.execute<LevelUpCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

import { Body, Controller, Delete, HttpCode, Logger, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/infrastructure/controller/dto';
import { Character } from '../../domain/aggregates/character.aggregate';
import { AddSkillDto } from './dto/add-skill.dto';
import { CharacterDto } from './dto/character.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { LevelUpSkillDto } from './dto/level-up-skill.dto';
import { LevelDownSkillDto } from './dto/level-down-skill.dto';
import { AddSkillCommand } from '../../application/cqrs/commands/add-skill.command';
import { DeleteSkillCommand } from '../../application/cqrs/commands/delete-skill-command';
import { LevelDownSkillCommand } from '../../application/cqrs/commands/level-down-skill.command';
import { LevelUpSkillCommand } from '../../application/cqrs/commands/level-up-skill.command';
import { SetUpProfessionalSkillCommand } from '../../application/cqrs/commands/setup-professional-skill.command';
import { UpdateSkillCommand } from '../../application/cqrs/commands/update-skill.command';
import type { AuthRequest } from 'src/modules/shared/infrastructure/controller/auth-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character skills')
export class CharacterSkillController {
  private readonly logger = new Logger(CharacterSkillController.name);

  constructor(private commandBus: CommandBus) {}

  @Post(':id/skills')
  @ApiBody({ type: AddSkillDto })
  @ApiOperation({ operationId: 'addSkill', summary: 'Add a new skill to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addSkill(@Param('id') id: string, @Body() dto: AddSkillDto, @Request() req: AuthRequest) {
    this.logger.debug(`Adding character ${id} skill ${dto.skillId} for user ${req.user.id}`);
    const command = AddSkillDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<AddSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId')
  @ApiBody({ type: UpdateSkillDto })
  @ApiOperation({ operationId: 'updateSkill', summary: 'Update a skill of a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateSkillDto,
    @Request() req: AuthRequest,
  ) {
    this.logger.debug(`Updating character ${id} skill  ${skillId} for user ${req.user.id}`);
    const command = UpdateSkillDto.toCommand(id, skillId, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<UpdateSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId/level-up')
  @ApiBody({ type: LevelUpSkillDto })
  @ApiOperation({ operationId: 'levelUpSkill', summary: 'Level up skill' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async levelUpSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: LevelUpSkillDto,
    @Request() req: AuthRequest,
  ) {
    this.logger.debug(`Leveling up character ${id} skill  ${skillId} for user ${req.user.id}`);
    const command = LevelUpSkillDto.toCommand(id, skillId, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<LevelUpSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId/level-down')
  @ApiBody({ type: LevelUpSkillDto })
  @ApiOperation({ operationId: 'levelDownSkill', summary: 'Level down skill' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async levelDownSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: LevelDownSkillDto,
    @Request() req: AuthRequest,
  ) {
    this.logger.debug(`Leveling down character ${id} skill ${skillId} for user ${req.user.id}`);
    const command = LevelDownSkillDto.toCommand(id, skillId, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<LevelDownSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId/professional')
  @ApiOperation({ operationId: 'makeProfessionalSkill', summary: 'Make skill professional' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async makeProfessionalSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Request() req: AuthRequest) {
    this.logger.debug(`Leveling down character ${id} skill ${skillId} for user ${req.user.id}`);
    const command = new SetUpProfessionalSkillCommand(id, skillId, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<SetUpProfessionalSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/skills/:skillId')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteSkill', summary: 'Delete a skill from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async deleteSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Request() req: AuthRequest) {
    this.logger.debug(`Deleting character ${id} skill ${skillId} for user ${req.user.id}`);
    const command = new DeleteSkillCommand(id, skillId, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<DeleteSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

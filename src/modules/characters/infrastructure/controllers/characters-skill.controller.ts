/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Logger, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/infrastructure/controller/dto';
import { AddSkillCommand } from '../../application/commands/add-skill.command';
import { DeleteSkillCommand } from '../../application/commands/delete-skill-command';
import { UpdateSkillCommand } from '../../application/commands/update-skill.command';
import { Character } from '../../domain/entities/character.entity';
import { AddSkillDto } from './dto/add-skill.dto';
import { CharacterDto } from './dto/character.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { LevelUpSkillDto } from './dto/level-up-skill.dto';
import { LevelUpSkillCommand } from '../../application/commands/level-up-skill.command';
import { LevelDownSkillDto } from './dto/level-down-skill.dto';
import { LevelDownSkillCommand } from '../../application/commands/level-down-skill.command';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Characters')
export class CharacterSkillController {
  private readonly logger = new Logger(CharacterSkillController.name);

  constructor(private commandBus: CommandBus) {}

  @Post(':id/skills')
  @ApiBody({ type: AddSkillDto })
  @ApiOperation({ operationId: 'addSkill', summary: 'Add a new skill to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addSkill(@Param('id') id: string, @Body() dto: AddSkillDto, @Request() req) {
    this.logger.debug(`Adding character ${id} skill ${dto.skillId} for user ${req.user}`);
    const user = req.user!;
    const command = AddSkillDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId')
  @ApiBody({ type: UpdateSkillDto })
  @ApiOperation({ operationId: 'updateSkill', summary: 'Update a skill of a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Body() dto: UpdateSkillDto, @Request() req) {
    this.logger.debug(`Updating character ${id} skill  ${skillId} for user ${req.user}`);
    const user = req.user!;
    const command = UpdateSkillDto.toCommand(id, skillId, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/skills/:skillId/level-up')
  @ApiBody({ type: LevelUpSkillDto })
  @ApiOperation({ operationId: 'levelUpSkill', summary: 'Level up skill' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async levelUpSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Body() dto: LevelUpSkillDto, @Request() req) {
    this.logger.debug(`Leveling up character ${id} skill  ${skillId} for user ${req.user}`);
    const user = req.user!;
    const command = LevelUpSkillDto.toCommand(id, skillId, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<LevelUpSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/skills/:skillId/level-down')
  @ApiBody({ type: LevelUpSkillDto })
  @ApiOperation({ operationId: 'levelDownSkill', summary: 'Level down skill' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async levelDownSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Body() dto: LevelDownSkillDto, @Request() req) {
    this.logger.debug(`Leveling down character ${id} skill ${skillId} for user ${req.user}`);
    const user = req.user!;
    const command = LevelDownSkillDto.toCommand(id, skillId, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<LevelDownSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/skills/:skillId')
  @ApiOperation({ operationId: 'deleteSkill', summary: 'Delete a skill from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async deleteSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Request() req) {
    this.logger.debug(`Deleting character ${id} skill ${skillId} for user ${req.user}`);
    const user = req.user!;
    const command = new DeleteSkillCommand(id, skillId, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

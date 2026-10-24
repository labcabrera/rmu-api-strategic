import { Body, Controller, Delete, HttpCode, Logger, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { AddSkillDto } from './dto/add-skill.dto';
import { CharacterDto } from './dto/character.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { UpdateProfessionalSkillDto } from './dto/update-professional-skill.dto';
import { AddSkillCommand } from '../../application/cqrs/commands/add-skill.command';
import { DeleteSkillCommand } from '../../application/cqrs/commands/delete-skill.command';
import { LevelDownSkillCommand } from '../../application/cqrs/commands/level-down-skill.command';
import { LevelUpSkillCommand } from '../../application/cqrs/commands/level-up-skill.command';
import { SetUpProfessionalSkillCommand } from '../../application/cqrs/commands/setup-professional-skill.command';
import { UpdateSkillCommand } from '../../application/cqrs/commands/update-skill.command';
import { Character } from '../../domain/aggregates/character';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedRequest, AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

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
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async addSkill(@Param('id') id: string, @Body() dto: AddSkillDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Adding character ${id} skill ${dto.skillId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = AddSkillDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<AddSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId')
  @ApiBody({ type: UpdateSkillDto })
  @ApiOperation({ operationId: 'updateSkill', summary: 'Update a skill of a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async updateSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateSkillDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.debug(`Updating character ${id} skill  ${skillId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = UpdateSkillDto.toCommand(id, skillId, dto, userId, roles);
    const entity = await this.commandBus.execute<UpdateSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId/level-up')
  @ApiOperation({ operationId: 'levelUpSkill', summary: 'Level up skill' })
  @ApiParam({ name: 'id', required: true, type: String, description: 'Character identifier' })
  @ApiParam({ name: 'skillId', required: true, type: String, description: 'Skill identifier' })
  @ApiQuery({
    name: 'specialization',
    required: false,
    type: String,
    description: 'Optional specialization for the skill (e.g. "cats")',
  })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async levelUpSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Query('specialization') specialization: string | null,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.debug(`Leveling up character ${id} skill  ${skillId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = new LevelUpSkillCommand(id, skillId, specialization, userId, roles);
    const entity = await this.commandBus.execute<LevelUpSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId/level-down')
  @ApiParam({ name: 'id', required: true, type: String, description: 'Character identifier' })
  @ApiParam({ name: 'skillId', required: true, type: String, description: 'Skill identifier' })
  @ApiQuery({
    name: 'specialization',
    required: false,
    type: String,
    description: 'Optional specialization for the skill (e.g. "cats")',
  })
  @ApiOperation({ operationId: 'levelDownSkill', summary: 'Level down skill' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async levelDownSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Query('specialization') specialization: string | null,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.debug(`Leveling down character ${id} skill ${skillId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = new LevelDownSkillCommand(id, skillId, specialization, userId, roles);
    const entity = await this.commandBus.execute<LevelDownSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Put(':id/skills/:skillId/professional')
  @ApiOperation({ operationId: 'makeProfessionalSkill', summary: 'Make skill professional' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async makeProfessionalSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateProfessionalSkillDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.debug(`Updating professional skill for character ${id} and skill ${skillId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const specialization = req.query.specialization as string | null;
    const command = UpdateProfessionalSkillDto.toCommand(id, skillId, specialization, dto, userId, roles);
    const entity = await this.commandBus.execute<SetUpProfessionalSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/skills/:skillId')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteSkill', summary: 'Delete a skill from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async deleteSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Query('specialization') specialization: string | null,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.debug(`Deleting character ${id} skill ${skillId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = new DeleteSkillCommand(id, skillId, specialization, userId, roles);
    const entity = await this.commandBus.execute<DeleteSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

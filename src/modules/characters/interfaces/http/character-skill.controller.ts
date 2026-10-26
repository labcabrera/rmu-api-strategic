import { Body, Controller, Delete, HttpCode, Logger, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { AddSkillDto } from './dto/add-skill.dto.js';
import { CharacterDto } from './dto/character.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';
import { UpdateProfessionalSkillDto } from './dto/update-professional-skill.dto.js';
import { AddSkillCommand } from '../../application/cqrs/commands/add-skill.command.js';
import { DeleteSkillCommand } from '../../application/cqrs/commands/delete-skill.command.js';
import { LevelDownSkillCommand } from '../../application/cqrs/commands/level-down-skill.command.js';
import { LevelUpSkillCommand } from '../../application/cqrs/commands/level-up-skill.command.js';
import { SetUpProfessionalSkillCommand } from '../../application/cqrs/commands/setup-professional-skill.command.js';
import { AddStyleAbilityCommand } from '../../application/cqrs/commands/add-style-ability.command.js';
import { RemoveStyleAbilityCommand } from '../../application/cqrs/commands/remove-style-ability.command.js';
import { AddStyleAbilityDto } from './dto/add-style-ability.dto.js';
import { UpdateSkillCommand } from '../../application/cqrs/commands/update-skill.command.js';
import { Character } from '../../domain/aggregates/character.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character skills')
export class CharacterSkillController {
  private readonly logger = new Logger(CharacterSkillController.name);

  constructor(private commandBus: CommandBus) {}

  @Post(':id/skills')
  @ApiBody({ type: AddSkillDto })
  @ApiOperation({ operationId: 'addSkill', summary: 'Add a new skill to a character' })
  @ApiCreatedResponse({ type: CharacterDto, description: 'Success' })
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

  @Post(':id/skills/:skillId/style-abilities')
  @ApiBody({ type: AddStyleAbilityDto })
  @ApiOperation({
    operationId: 'addStyleAbility',
    summary: 'Allocate ranks of a fighting style to one of its abilities',
    description: 'Uses free ranks of the style (spec 032). Selections are permanent for the player.',
  })
  @ApiParam({ name: 'skillId', required: true, type: String, description: 'Fighting style skill', example: 'combat-styles' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Not a style ability, not enough free ranks or missing requirements' })
  @HttpCode(200)
  async addStyleAbility(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: AddStyleAbilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = AddStyleAbilityDto.toCommand(id, skillId, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddStyleAbilityCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/skills/:skillId/style-abilities/:abilityId')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'removeStyleAbility',
    summary: 'Undo one selection of a fighting style ability',
    description: 'Only the owner of the strategic game or an admin (spec 032).',
  })
  @ApiQuery({ name: 'specialization', required: true, type: String, description: 'Fighting style', example: 'fencing' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'The ability is not selected', 403: 'Not the game master' })
  async removeStyleAbility(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Param('abilityId') abilityId: string,
    @Query('specialization') specialization: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new RemoveStyleAbilityCommand(id, skillId, specialization, abilityId, user.id, user.roles);
    const entity = await this.commandBus.execute<RemoveStyleAbilityCommand, Character>(command);
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

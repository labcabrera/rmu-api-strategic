import { Body, Controller, Delete, HttpCode, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { CharacterDto } from './dto/character.dto.js';
import { AddTraitDto } from './dto/add-trait.dto.js';
import { DeleteTraitDto } from './dto/delete-trait.dto.js';
import { AddTraitCommand } from '../../application/cqrs/commands/add-trait.command.js';
import { DeleteTraitCommand } from '../../application/cqrs/commands/delete-trait.command.js';
import { Character } from '../../domain/aggregates/character.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Characters')
export class CharacterTraitController {
  private readonly logger = new Logger(CharacterTraitController.name);

  constructor(private commandBus: CommandBus) {}

  @Post(':id/traits')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addTrait', summary: 'Add a trait to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async addTrait(@Param('id') id: string, @Body() dto: AddTraitDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Adding trait to character: ${id} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = AddTraitDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<AddTraitCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/traits')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteTrait', summary: 'Delete a skill from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async deleteTrait(@Param('id') id: string, @Body() dto: DeleteTraitDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Deleting character ${id} trait ${dto.traitId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = DeleteTraitDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<DeleteTraitCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

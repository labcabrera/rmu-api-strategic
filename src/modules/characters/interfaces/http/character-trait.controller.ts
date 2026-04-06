import { Body, Controller, Delete, HttpCode, Logger, Param, Post, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { CharacterDto } from './dto/character.dto';
import { AddTraitDto } from './dto/add-trait.dto';
import { DeleteTraitDto } from './dto/delete-trait.dto';
import { ErrorDto } from 'src/modules/shared/interfaces/http/dto/error-dto';
import { AddTraitCommand } from 'src/modules/characters/application/cqrs/commands/add-trait.command';
import { DeleteTraitCommand } from 'src/modules/characters/application/cqrs/commands/delete-trait.command';
import { Character } from 'src/modules/characters/domain/aggregates/character.aggregate';

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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addTrait(@Param('id') id: string, @Body() dto: AddTraitDto, @Request() req) {
    this.logger.debug(`Adding trait to character: ${id} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const command = AddTraitDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<AddTraitCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/traits')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteTrait', summary: 'Delete a skill from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async deleteTrait(@Param('id') id: string, @Body() dto: DeleteTraitDto, @Request() req) {
    this.logger.debug(`Deleting character ${id} trait ${dto.traitId} for user ${req.user.id}`);
    const userId = req.user.id as string;
    const roles = req.user.roles as string[];
    const command = DeleteTraitDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<DeleteTraitCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

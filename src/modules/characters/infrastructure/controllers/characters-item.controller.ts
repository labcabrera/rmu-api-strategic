import { Body, Controller, Delete, Logger, Param, Post, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/infrastructure/controller/dto';
import { AddItemCommand } from '../../application/commands/add-item.comand';
import { DeleteItemCommand } from '../../application/commands/delete-item.command';
import { Character } from '../../domain/entities/character.entity';
import { AddItemDto } from './dto/add-item.dto';
import { CharacterDto } from './dto/character.dto';
import { EquipItemDto } from './dto/equip-item.dto';
import { EquipItemCommand } from '../../application/commands/equip-item-command';
import * as ar from 'src/modules/shared/infrastructure/controller/auth-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character items')
export class CharacterItemController {
  private readonly logger = new Logger(CharacterItemController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post(':id/items')
  @ApiBody({ type: AddItemDto })
  @ApiOperation({ operationId: 'addItem', summary: 'Add a new item to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addItem(@Param('id') id: string, @Body() dto: AddItemDto, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Adding character ${id} item ${dto.itemTypeId} for user ${req.user.id}`);
    const command = AddItemDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<AddItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ operationId: 'deleteItem', summary: 'Delete an item from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Deleting character ${id} item ${itemId} for user ${req.user.id}`);
    const command = new DeleteItemCommand(id, itemId, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<DeleteItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/equipment')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'equipItem', summary: 'Equip an item to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async equipItem(@Param('id') id: string, @Body() dto: EquipItemDto, @Request() req: ar.AuthRequest) {
    this.logger.debug(`Equipping character ${id} item ${dto.itemId} for user ${req.user.id}`);
    const command = EquipItemDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<EquipItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

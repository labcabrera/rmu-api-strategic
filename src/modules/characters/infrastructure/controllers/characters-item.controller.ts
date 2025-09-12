import { Body, Controller, Delete, Logger, Param, Patch, Post, Put, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/infrastructure/controller/dto';
import { Character } from '../../domain/entities/character.entity';
import { AddItemDto } from './dto/add-item.dto';
import { CharacterDto } from './dto/character.dto';
import { EquipItemDto } from './dto/equip-item.dto';
import { TransferGoldDto } from './dto/transfer-faction-gold.dto';
import { AddItemCommand } from '../../application/cqrs/commands/add-item.comand';
import { DeleteItemCommand } from '../../application/cqrs/commands/delete-item.command';
import { EquipItemCommand } from '../../application/cqrs/commands/equip-item-command';
import { TransferGoldCommand } from '../../application/cqrs/commands/transfer-gold.command';
import { UnequipItemCommand } from '../../application/cqrs/commands/unequip-item-command';
import { UpdateItemCarriedStatusCommand } from '../../application/cqrs/commands/update-item-carried-status.command';
import type { AuthRequest } from 'src/modules/shared/infrastructure/controller/auth-request';

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
  async addItem(@Param('id') id: string, @Body() dto: AddItemDto, @Request() req: AuthRequest) {
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
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req: AuthRequest) {
    this.logger.debug(`Deleting character ${id} item ${itemId} for user ${req.user.id}`);
    const command = new DeleteItemCommand(id, itemId, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<DeleteItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Put(':id/items/:itemId/carried/:carried')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'updateCarriedStatus', summary: 'Update the carried status of an item' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateCarriedStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Param('carried') carried: boolean,
    @Request() req: AuthRequest,
  ) {
    this.logger.debug(`Updating carried status for character ${id} item ${itemId} to ${carried} for user ${req.user.id}`);
    const command = new UpdateItemCarriedStatusCommand(id, itemId, carried, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<UpdateItemCarriedStatusCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/transfer-faction-gold')
  @ApiBody({ type: TransferGoldDto })
  @ApiOperation({ operationId: 'transferFactionGold', summary: 'Transfer gold between character and his faction' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async transferFactionGold(@Param('id') id: string, @Body() dto: TransferGoldDto, @Request() req: AuthRequest) {
    this.logger.debug(`Transferring faction gold for character ${id} for user ${req.user.id}`);
    const command = TransferGoldDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<TransferGoldCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/equipment')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'equipItem', summary: 'Equip an item to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async equipItem(@Param('id') id: string, @Body() dto: EquipItemDto, @Request() req: AuthRequest) {
    this.logger.debug(`Equipping character ${id} item ${dto.itemId} for user ${req.user.id}`);
    const command = EquipItemDto.toCommand(id, dto, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<EquipItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/equipment/:slot')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'unequipItem', summary: 'Unequip an item from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async unequipItem(@Param('id') id: string, @Param('slot') slot: string, @Request() req: AuthRequest) {
    this.logger.debug(`Unequipping character ${id} slot ${slot} for user ${req.user.id}`);
    const command = new UnequipItemCommand(id, slot, req.user.id, req.user.roles);
    const entity = await this.commandBus.execute<UnequipItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

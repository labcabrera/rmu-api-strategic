import { Body, Controller, Delete, Logger, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { CarriedStatusParamsDto } from './dto/carried-status-params.dto.js';
import { CharacterDto } from './dto/character.dto.js';
import { EquipItemDto } from './dto/equip-item.dto.js';
import { TransferGoldDto } from './dto/transfer-faction-gold.dto.js';
import { UpdateItemCarriedStatusCommand } from '../../application/cqrs/commands/update-item-carried-status.command.js';
import { Character } from '../../domain/aggregates/character.js';
import { TransferGoldCommand } from '../../application/cqrs/commands/transfer-gold.command.js';
import { UnequipItemCommand } from '../../application/cqrs/commands/unequip-item.command.js';
import { EquipItemCommand } from '../../application/cqrs/commands/equip-item.command.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Character items')
export class CharacterItemController {
  private readonly logger = new Logger(CharacterItemController.name);

  constructor(private commandBus: CommandBus) {}

  @Put(':id/items/:itemId/carried/:carried')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'updateCarriedStatus', summary: 'Update the carried status of an item' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async updateCarriedStatus(@Param() { id, itemId, carried }: CarriedStatusParamsDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Updating carried status for character ${id} item ${itemId} to ${carried} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = new UpdateItemCarriedStatusCommand(id, itemId, carried, userId, roles);
    const entity = await this.commandBus.execute<UpdateItemCarriedStatusCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/transfer-faction-gold')
  @ApiBody({ type: TransferGoldDto })
  @ApiOperation({ operationId: 'transferFactionGold', summary: 'Transfer gold between character and his faction' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async transferFactionGold(@Param('id') id: string, @Body() dto: TransferGoldDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Transferring faction gold for character ${id} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = TransferGoldDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<TransferGoldCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/equipment')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'equipItem', summary: 'Equip an item to a character' })
  @ApiCreatedResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async equipItem(@Param('id') id: string, @Body() dto: EquipItemDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Equipping character ${id} item ${dto.itemId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = EquipItemDto.toCommand(id, dto, userId, roles);
    const entity = await this.commandBus.execute<EquipItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/equipment/:itemId')
  @ApiBody({ type: EquipItemDto })
  @ApiOperation({ operationId: 'unequipItem', summary: 'Unequip an item from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async unequipItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: AuthenticatedUser) {
    // The item leaves the slot it is in (spec 023, decision 16: the parameter was misnamed `slot`)
    this.logger.debug(`Unequipping character ${id} item ${itemId} for user ${user.id}`);
    const userId = user.id;
    const roles = user.roles;
    const command = new UnequipItemCommand(id, itemId, userId, roles);
    const entity = await this.commandBus.execute<UnequipItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}

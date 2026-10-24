import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { Page } from '../../../shared/application/pagination/page';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query';
import { CreateItemCommand } from '../../application/cqrs/commands/create-item.command';
import { DeleteItemCommand } from '../../application/cqrs/commands/delete-item.command';
import { UpdateItemCommand } from '../../application/cqrs/commands/update-item.command';
import { GetItemQuery } from '../../application/cqrs/queries/get-item.query';
import { GetItemsQuery } from '../../application/cqrs/queries/get-items.query';
import { Item } from '../../domain/aggregates/item';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemDto, ItemPageDto } from './dto/item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AddItemModifierDto } from './dto/item-modifier.dto';
import { AddItemModifierCommand } from '../../application/cqrs/commands/add-item-modifier.command';
import { DeleteItemModifierCommand } from '../../application/cqrs/commands/delete-item-modifier.command';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/items')
@ApiTags('Items')
export class ItemController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findItemById', summary: 'Find game by id' })
  @ApiOkResponse({ type: ItemDto })
  @ApiErrors({ 404: 'Item not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetItemQuery(id, userId, roles);
    const entity = await this.queryBus.execute<GetItemQuery, Item>(query);
    return ItemDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findItms', summary: 'Find items by RSQL' })
  @ApiOkResponse({ type: ItemPageDto })
  @ApiErrors({ 400: 'Invalid RSQL query' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetItemsQuery(dto.q, dto.page, dto.size, userId, roles);
    const page = await this.queryBus.execute<GetItemsQuery, Page<Item>>(query);
    const mapped = page.content.map(game => ItemDto.fromEntity(game));
    return new Page<ItemDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createItem', summary: 'Create a new item' })
  @ApiOkResponse({ type: ItemDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const command = CreateItemDto.toCommand(dto, userId, roles);
    const game = await this.commandBus.execute<CreateItemCommand, Item>(command);
    return ItemDto.fromEntity(game);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateItem', summary: 'Update item by id' })
  @ApiOkResponse({ type: ItemDto, description: 'Success' })
  @ApiErrors({ 404: 'Game not found', 400: 'Bad request, invalid data' })
  async updateGame(@Param('id') id: string, @Body() updateGameDto: UpdateItemDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const command = UpdateItemDto.toCommand(id, updateGameDto, userId, roles);
    const game = await this.commandBus.execute<UpdateItemCommand, Item>(command);
    return ItemDto.fromEntity(game);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteGame', summary: 'Delete game by id' })
  @ApiErrors({ 404: 'Game not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const command = new DeleteItemCommand(id, userId, roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/modifiers')
  @ApiOperation({ operationId: 'addItemModifier', summary: 'Add a modifier (breakage, quality...) to the item' })
  @ApiOkResponse({ type: ItemDto, description: 'Success' })
  @ApiErrors({ 404: 'Item not found', 400: 'Bad request, invalid data' })
  async addModifier(@Param('id') id: string, @Body() dto: AddItemModifierDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddItemModifierDto.toCommand(id, dto, user.id, user.roles);
    const item = await this.commandBus.execute<AddItemModifierCommand, Item>(command);
    return ItemDto.fromEntity(item);
  }

  @Delete(':id/modifiers/:modifierId')
  @ApiOperation({ operationId: 'deleteItemModifier', summary: 'Remove a modifier of the item (a repair by hand)' })
  @ApiOkResponse({ type: ItemDto, description: 'Success' })
  @ApiErrors({ 404: 'Item or modifier not found' })
  async deleteModifier(@Param('id') id: string, @Param('modifierId') modifierId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DeleteItemModifierCommand(id, modifierId, user.id, user.roles);
    const item = await this.commandBus.execute<DeleteItemModifierCommand, Item>(command);
    return ItemDto.fromEntity(item);
  }
}

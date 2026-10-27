import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { CatalogPagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { CreateItemCommand } from '../../application/cqrs/commands/create-item.command.js';
import { DeleteItemCommand } from '../../application/cqrs/commands/delete-item.command.js';
import { RemoveCoatingCommand } from '../../application/cqrs/commands/coat-item.command.js';
import { UpdateItemCommand } from '../../application/cqrs/commands/update-item.command.js';
import { GetItemQuery } from '../../application/cqrs/queries/get-item.query.js';
import { GetItemsQuery } from '../../application/cqrs/queries/get-items.query.js';
import { Item } from '../../domain/aggregates/item.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { ItemDto, ItemPageDto } from './dto/item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { AddItemModifierDto } from './dto/item-modifier.dto.js';
import { AddItemModifierCommand } from '../../application/cqrs/commands/add-item-modifier.command.js';
import { DeleteItemModifierCommand } from '../../application/cqrs/commands/delete-item-modifier.command.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import type { ItemOperationResult } from '../../application/services/item-stock.service.js';
import type { PriceQuote } from '../../application/cqrs/handlers/quote-price.handler.js';
import { ItemOperationResultDto, PriceQuoteDto } from './dto/item-ledger.dto.js';
import {
  CraftItemDto,
  CoatItemDto,
  DiscardItemDto,
  PurchaseItemDto,
  QuotePriceDto,
  RepairItemDto,
  SellItemDto,
  TransferItemDto,
} from './dto/item-operations.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/items')
@ApiTags('Items')
export class ItemController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('purchases')
  @ApiOperation({ operationId: 'purchaseItem', summary: 'Buy items of a catalog type for a character or a faction (spec 023)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto })
  @ApiErrors({ 400: 'Invalid data or not enough gold', 403: 'Not allowed to spend that gold' })
  async purchase(@Body() dto: PurchaseItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(PurchaseItemDto.toCommand(dto, user.id, user.roles));
  }

  @Post('crafts')
  @ApiOperation({ operationId: 'craftItem', summary: 'A craftsman makes an item of a catalog type (spec 023)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto, description: 'The item is null when the maneuver failed' })
  @ApiErrors({ 400: 'Invalid data or not enough gold', 403: 'Not allowed' })
  async craft(@Body() dto: CraftItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(CraftItemDto.toCommand(dto, user.id, user.roles));
  }

  @Post('price-quotes')
  @HttpCode(200)
  @ApiOperation({ operationId: 'quoteItemPrice', summary: 'Price of a purchase or a sale, without making it (spec 023)' })
  @ApiOkResponse({ type: PriceQuoteDto })
  @ApiErrors({ 400: 'Invalid data' })
  async quote(@Body() dto: QuotePriceDto, @CurrentUser() user: AuthenticatedUser) {
    const quote = await this.queryBus.execute<ReturnType<typeof QuotePriceDto.toQuery>, PriceQuote>(
      QuotePriceDto.toQuery(dto, user.id, user.roles),
    );
    return PriceQuoteDto.of(quote);
  }

  @Post(':id/sale')
  @ApiOperation({ operationId: 'sellItem', summary: 'Sell an item or units of a stack: its holder gets the gold (spec 023)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Invalid data' })
  async sell(@Param('id') id: string, @Body() dto: SellItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(SellItemDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/transfer')
  @ApiOperation({ operationId: 'transferItem', summary: 'Give an item or units of a stack to another holder of the game (spec 023)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Invalid data', 403: 'Not allowed' })
  async transfer(@Param('id') id: string, @Body() dto: TransferItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(TransferItemDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/repairs')
  @ApiOperation({ operationId: 'repairItem', summary: 'Repair a damaged or broken item (§6.2, spec 023)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Not damaged, unrepairable or invalid data' })
  async repair(@Param('id') id: string, @Body() dto: RepairItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(RepairItemDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/discard')
  @ApiOperation({ operationId: 'discardItem', summary: 'Throw away an item or units of a stack, with a ledger entry (spec 023)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Invalid data' })
  async discard(@Param('id') id: string, @Body() dto: DiscardItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(DiscardItemDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/coating')
  @ApiOperation({ operationId: 'coatItem', summary: 'Coat a weapon with a dose of a poison of its holder (spec 042)' })
  @ApiCreatedResponse({ type: ItemOperationResultDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Not a weapon, not a coating poison or another holder' })
  async coat(@Param('id') id: string, @Body() dto: CoatItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operation(CoatItemDto.toCommand(id, dto, user.id, user.roles));
  }

  @Delete(':id/coating')
  @ApiOperation({ operationId: 'removeCoating', summary: 'Remove the poison of a weapon (spec 042)' })
  @ApiOkResponse({ type: ItemDto })
  @ApiErrors({ 404: 'Item not found' })
  async removeCoating(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const item = await this.commandBus.execute<RemoveCoatingCommand, Item>(new RemoveCoatingCommand(id, user.id, user.roles));
    return ItemDto.fromEntity(item);
  }

  private async operation(command: object): Promise<ItemOperationResultDto> {
    const result = await this.commandBus.execute<object, ItemOperationResult>(command);
    return ItemOperationResultDto.fromResult(result);
  }

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
  async find(@Query() dto: CatalogPagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const roles = user.roles;
    const query = new GetItemsQuery(dto.q, dto.page, dto.size, userId, roles);
    const page = await this.queryBus.execute<GetItemsQuery, Page<Item>>(query);
    const mapped = page.content.map(game => ItemDto.fromEntity(game));
    return new Page<ItemDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOperation({ operationId: 'createItem', summary: 'Create a new item' })
  @ApiCreatedResponse({ type: ItemDto, description: 'Success' })
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
  @ApiCreatedResponse({ type: ItemDto, description: 'Success' })
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

import { Body, Controller, Delete, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CutGemCommand, SetGemCommand, UnsetGemCommand } from '../../application/cqrs/commands/magic-item.commands.js';
import type { Item } from '../../domain/aggregates/item.js';
import type { MagicItemQuote } from '../../domain/services/magic-item-pricing.js';
import { ItemDto } from './dto/item.dto.js';
import {
  ChangeItemChargesDto,
  CreateMagicItemDto,
  CutGemDto,
  MagicItemQuoteDto,
  MagicItemRequestDto,
  SetGemDto,
} from './dto/magic-item.dto.js';

/** Magic items, charges and gems of workspace spec 067. */
@UseGuards(JwtAuthGuard)
@Controller('v1/items')
@ApiTags('Items')
export class MagicItemController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('magic/quote')
  @HttpCode(200)
  @ApiOperation({ operationId: 'quoteMagicItem', summary: 'Price of a magic item from a base item: chapter 6 tables or formula 6-1a' })
  @ApiOkResponse({ type: MagicItemQuoteDto })
  @ApiErrors({ 400: 'Invalid data, unknown base item or standard enhancement' })
  async quote(@Body() dto: MagicItemRequestDto, @CurrentUser() user: AuthenticatedUser): Promise<MagicItemQuoteDto> {
    const quote = await this.queryBus.execute<object, MagicItemQuote>(MagicItemRequestDto.toQuery(dto, user.id, user.roles));
    return MagicItemQuoteDto.of(quote);
  }

  @Post('magic')
  @ApiOperation({ operationId: 'createMagicItem', summary: 'Give a magic item to a character or faction, for free or paid' })
  @ApiCreatedResponse({ type: ItemDto })
  @ApiErrors({ 400: 'Invalid data or not enough gold', 403: 'Not allowed', 404: 'Holder not found' })
  async create(@Body() dto: CreateMagicItemDto, @CurrentUser() user: AuthenticatedUser): Promise<ItemDto> {
    return this.item(CreateMagicItemDto.toCommand(dto, user.id, user.roles));
  }

  @Post(':id/charges')
  @HttpCode(200)
  @ApiOperation({ operationId: 'changeItemCharges', summary: 'Spend or add charges, or recharge the item (2 sp per day)' })
  @ApiOkResponse({ type: ItemDto })
  @ApiErrors({ 404: 'Item not found', 400: 'No charges, out of range or not enough gold', 403: 'Not allowed' })
  async charges(@Param('id') id: string, @Body() dto: ChangeItemChargesDto, @CurrentUser() user: AuthenticatedUser): Promise<ItemDto> {
    return this.item(ChangeItemChargesDto.toCommand(id, dto, user.id, user.roles));
  }

  @Post(':id/cut')
  @HttpCode(200)
  @ApiOperation({ operationId: 'cutGem', summary: 'Modern cut of a gem: value x5 or x10, the holder pays 10 % of it' })
  @ApiOkResponse({ type: ItemDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Not a gem or not enough gold', 409: 'Already cut', 403: 'Not allowed' })
  async cut(@Param('id') id: string, @Body() dto: CutGemDto, @CurrentUser() user: AuthenticatedUser): Promise<ItemDto> {
    return this.item(new CutGemCommand(id, dto.cutFactor, user.id, user.roles));
  }

  @Post(':id/settings')
  @ApiOperation({ operationId: 'setGem', summary: 'Set a gem of the same holder in the item' })
  @ApiCreatedResponse({ type: ItemDto })
  @ApiErrors({ 404: 'Item not found', 400: 'Not a gem, another holder or an invalid item', 403: 'Not allowed' })
  async setGem(@Param('id') id: string, @Body() dto: SetGemDto, @CurrentUser() user: AuthenticatedUser): Promise<ItemDto> {
    return this.item(new SetGemCommand(id, dto.gemItemId, user.id, user.roles));
  }

  @Delete(':id/settings/:index')
  @ApiOperation({ operationId: 'unsetGem', summary: 'Take a gem out of the item: it goes back to the holder' })
  @ApiOkResponse({ type: ItemDto })
  @ApiErrors({ 404: 'Item or setting not found', 403: 'Not allowed' })
  async unsetGem(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ItemDto> {
    return this.item(new UnsetGemCommand(id, index, user.id, user.roles));
  }

  private async item(command: object): Promise<ItemDto> {
    return ItemDto.fromEntity(await this.commandBus.execute<object, Item>(command));
  }
}

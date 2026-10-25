import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { GetItemLedgerQuery } from '../../application/cqrs/queries/get-item-ledger.query.js';
import { EconomyRulesProvider } from '../../application/services/economy-rules.provider.js';
import { ItemLedgerEntry } from '../../domain/aggregates/item-ledger-entry.js';
import { EconomyRulesDto, ItemLedgerEntryDto, ItemLedgerPageDto } from './dto/item-ledger.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('v1')
@ApiTags('Item ledger')
export class ItemLedgerController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly rules: EconomyRulesProvider,
  ) {}

  @Get('item-ledger')
  @ApiOperation({
    operationId: 'findItemLedger',
    summary: 'Operations on items and gold, newest first (spec 023)',
    description: 'RSQL on itemId, holderIds (a character or faction), gameId or kind.',
  })
  @ApiOkResponse({ type: ItemLedgerPageDto })
  @ApiErrors({ 400: 'Invalid RSQL query' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const page = await this.queryBus.execute<GetItemLedgerQuery, Page<ItemLedgerEntry>>(
      new GetItemLedgerQuery(dto.q, dto.page, dto.size, user.id, user.roles),
    );
    return new Page<ItemLedgerEntryDto>(
      page.content.map(entry => ItemLedgerEntryDto.fromEntity(entry)),
      page.pagination.page,
      page.pagination.size,
      page.pagination.totalElements,
    );
  }

  @Get('economy-rules')
  @ApiOperation({ operationId: 'getEconomyRules', summary: 'House rules of sales and crafting materials (spec 023)' })
  @ApiOkResponse({ type: EconomyRulesDto })
  economyRules() {
    return EconomyRulesDto.of(this.rules.rules());
  }
}

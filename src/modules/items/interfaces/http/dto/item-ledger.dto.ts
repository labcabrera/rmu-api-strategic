import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import type { ItemOperationResult } from '../../../application/services/item-stock.service.js';
import type { PriceQuote } from '../../../application/cqrs/handlers/quote-price.handler.js';
import {
  ITEM_LEDGER_KINDS,
  type ItemLedgerEntry,
  type ItemLedgerKind,
  type LedgerManeuver,
  type LedgerPayment,
} from '../../../domain/aggregates/item-ledger-entry.js';
import type { EconomyRules, PriceBreakdown } from '../../../domain/services/price-calculator.js';
import type { ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import { ItemDto } from './item.dto.js';

export class ItemLedgerEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  gameId: string;

  @ApiProperty({ enum: ITEM_LEDGER_KINDS })
  kind: ItemLedgerKind;

  @ApiProperty({ nullable: true })
  itemId: string | null;

  @ApiProperty({ nullable: true })
  itemTypeId: string | null;

  @ApiProperty({ nullable: true })
  itemName: string | null;

  @ApiProperty({ nullable: true })
  amount: number | null;

  @ApiProperty({ nullable: true, description: 'Holder the item or gold left' })
  from: ItemHolder | null;

  @ApiProperty({ nullable: true, description: 'Holder the item or gold went to' })
  to: ItemHolder | null;

  @ApiProperty({ type: [String] })
  holderIds: string[];

  @ApiProperty({ description: 'Gold of each holder: negative paid, positive received' })
  payments: LedgerPayment[];

  @ApiProperty({ nullable: true })
  price: PriceBreakdown | null;

  @ApiProperty({ nullable: true })
  maneuver: LedgerManeuver | null;

  @ApiProperty({ nullable: true, description: 'Character who crafted or repaired' })
  actorId: string | null;

  @ApiProperty({ nullable: true, description: 'Outcome key of a craft or repair' })
  outcome: string | null;

  @ApiProperty({ nullable: true })
  note: string | null;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: ItemLedgerEntry): ItemLedgerEntryDto {
    return Object.assign(new ItemLedgerEntryDto(), entity.getProps());
  }
}

export class ItemLedgerPageDto {
  @ApiProperty({ type: [ItemLedgerEntryDto] })
  content: ItemLedgerEntryDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class ItemOperationResultDto {
  @ApiProperty({
    type: ItemDto,
    nullable: true,
    description: 'The item as it is now: null when it is gone (sold, discarded, failed craft)',
  })
  item: ItemDto | null;

  @ApiProperty({ type: ItemLedgerEntryDto })
  entry: ItemLedgerEntryDto;

  static fromResult(result: ItemOperationResult): ItemOperationResultDto {
    const dto = new ItemOperationResultDto();
    dto.item = result.item ? ItemDto.fromEntity(result.item) : null;
    dto.entry = ItemLedgerEntryDto.fromEntity(result.entry);
    return dto;
  }
}

export class EconomyRulesDto {
  @ApiProperty({ example: 50 })
  salePercent: number;

  @ApiProperty({ example: 50 })
  materialsPercent: number;

  @ApiProperty({ example: { intact: 100, damaged: 50, broken: 10 } })
  conditionPercent: EconomyRules['conditionPercent'];

  static of(rules: EconomyRules): EconomyRulesDto {
    return Object.assign(new EconomyRulesDto(), rules);
  }
}

export class PriceQuoteDto {
  @ApiProperty()
  price: PriceBreakdown;

  @ApiProperty({ type: EconomyRulesDto })
  rules: EconomyRulesDto;

  static of(quote: PriceQuote): PriceQuoteDto {
    return Object.assign(new PriceQuoteDto(), { price: quote.price, rules: EconomyRulesDto.of(quote.rules) });
  }
}

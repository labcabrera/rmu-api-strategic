import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DIFFICULTIES, type Difficulty } from '../../../../characters/domain/value-objects/difficulty.vo.js';
import { CraftItemCommand } from '../../../application/cqrs/commands/craft-item.command.js';
import { CoatItemCommand } from '../../../application/cqrs/commands/coat-item.command.js';
import { DiscardItemCommand } from '../../../application/cqrs/commands/discard-item.command.js';
import { PurchaseItemCommand } from '../../../application/cqrs/commands/purchase-item.command.js';
import { RepairItemCommand } from '../../../application/cqrs/commands/repair-item.command.js';
import { SellItemCommand } from '../../../application/cqrs/commands/sell-item.command.js';
import { TransferItemCommand } from '../../../application/cqrs/commands/transfer-item.command.js';
import { QuotePriceQuery } from '../../../application/cqrs/queries/quote-price.query.js';
import { QuoteCraftQuery } from '../../../application/cqrs/queries/quote-craft.query.js';
import {
  ARMOR_WEIGHT_PERCENTS,
  type CraftingQuality,
  MASTERWORK_KINDS,
  type MasterworkKind,
  WORKSHOP_QUALITIES,
  type WorkshopQuality,
} from '../../../domain/services/crafting-plan.js';
import type { TradingRequest } from '../../../application/services/trading.service.js';
import { PAYER_MODES, type PayerMode } from '../../../application/services/wallet.service.js';
import type { PriceFactorSelection, PriceKind } from '../../../domain/services/price-calculator.js';
import { PurchaseOrderCommand } from '../../../application/cqrs/commands/purchase-order.command.js';
import { QuotePurchaseOrderQuery } from '../../../application/cqrs/queries/quote-purchase-order.query.js';
import { MAX_ORDER_LINES } from '../../../application/services/purchase-pricing.service.js';
import { ITEM_HOLDER_KINDS, type ItemHolder, type ItemHolderKind } from '../../../domain/value-objects/item-holder.vo.js';
import { ITEM_MODIFIER_TARGETS, type ItemModifierTarget } from '../../../domain/value-objects/item-modifier.vo.js';
import { WEAPON_WIELDER_SIZES } from '../../../domain/value-objects/item-weapon.vo.js';

export class ItemHolderDto {
  @ApiProperty({ enum: ITEM_HOLDER_KINDS, example: 'character' })
  @IsIn(ITEM_HOLDER_KINDS)
  kind: ItemHolderKind;

  @ApiProperty({ example: 'character-001' })
  @IsString()
  @IsNotEmpty()
  id: string;

  static of(dto: ItemHolderDto | undefined): ItemHolder | undefined {
    return dto ? { kind: dto.kind, id: dto.id } : undefined;
  }
}

export class RollModifierDto {
  @ApiProperty({ example: 'merchant-trading' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: -25 })
  @IsNumber()
  value: number;
}

export class TradingRequestDto {
  @ApiProperty({ description: 'Open-ended roll of the active side (the buyer, or the seller)', example: 87 })
  @IsNumber()
  roll: number;

  @ApiProperty({ required: false, example: 87 })
  @IsNumber()
  @IsOptional()
  unmodifiedRoll?: number;

  @ApiProperty({ required: false, description: 'Trading bonus; by default the one of the character sheet', example: 35 })
  @IsNumber()
  @IsOptional()
  bonus?: number;

  @ApiProperty({ type: [RollModifierDto], required: false, description: 'The Trading of the merchant (negative), market...' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RollModifierDto)
  @IsOptional()
  modifiers?: RollModifierDto[];

  static of(dto: TradingRequestDto | undefined): TradingRequest | undefined {
    if (!dto) return undefined;
    return {
      roll: dto.roll,
      ...(dto.unmodifiedRoll !== undefined ? { unmodifiedRoll: dto.unmodifiedRoll } : {}),
      ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
      ...(dto.modifiers ? { modifiers: dto.modifiers.map(modifier => ({ key: modifier.key, value: modifier.value })) } : {}),
    };
  }
}

export class PriceFactorSelectionDto {
  @ApiProperty({ description: 'Key of a market condition of the trading tables of core', example: 'supply-demand' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ required: false, description: 'Option of a choice condition', example: 'demand-exceeds-supply' })
  @IsString()
  @IsOptional()
  option?: string;

  @ApiProperty({ required: false, description: 'Units of a number condition (days of travel...)', example: 3 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  units?: number;

  static of(dtos: PriceFactorSelectionDto[] | undefined): PriceFactorSelection[] | undefined {
    return dtos?.map(dto => ({
      key: dto.key,
      ...(dto.option !== undefined ? { option: dto.option } : {}),
      ...(dto.units !== undefined ? { units: dto.units } : {}),
    }));
  }
}

export class PurchaseOrderLineDto {
  @ApiProperty({ example: 'longsword' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.001)
  amount: number;
}

/** Market conditions and Trading of a purchase order, shared by the operation and its quote (workspace spec 048). */
class PurchaseOrderTermsDto {
  @ApiProperty({ type: [PurchaseOrderLineDto], description: `From 1 to ${MAX_ORDER_LINES} lines` })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_LINES)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];

  @ApiProperty({ type: [PriceFactorSelectionDto], required: false, description: 'Market conditions of every line' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceFactorSelectionDto)
  @IsOptional()
  factors?: PriceFactorSelectionDto[];

  @ApiProperty({ type: TradingRequestDto, required: false, description: 'One negotiation for every line' })
  @ValidateNested()
  @Type(() => TradingRequestDto)
  @IsOptional()
  trading?: TradingRequestDto;
}

export class PurchaseOrderDto extends PurchaseOrderTermsDto {
  @ApiProperty({ type: ItemHolderDto, description: 'The character or faction that buys' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  buyer: ItemHolderDto;

  @ApiProperty({ required: false, description: 'Checked against the game of the buyer' })
  @IsString()
  @IsOptional()
  gameId?: string;

  @ApiProperty({ enum: PAYER_MODES, required: false, description: 'A character pays with its coins, its faction, or both' })
  @IsIn(PAYER_MODES)
  @IsOptional()
  payer?: PayerMode;

  static toCommand(dto: PurchaseOrderDto, userId: string, roles: string[]): PurchaseOrderCommand {
    return new PurchaseOrderCommand(
      ItemHolderDto.of(dto.buyer)!,
      dto.lines.map(line => ({ itemTypeId: line.itemTypeId, amount: line.amount })),
      {
        gameId: dto.gameId,
        payer: dto.payer,
        factors: PriceFactorSelectionDto.of(dto.factors),
        trading: TradingRequestDto.of(dto.trading),
      },
      userId,
      roles,
    );
  }
}

export class QuotePurchaseOrderDto extends PurchaseOrderTermsDto {
  @ApiProperty({ type: ItemHolderDto, required: false, description: 'The buyer, for the Trading bonus of its sheet' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  @IsOptional()
  buyer?: ItemHolderDto;

  static toQuery(dto: QuotePurchaseOrderDto, userId: string, roles: string[]): QuotePurchaseOrderQuery {
    return new QuotePurchaseOrderQuery(
      ItemHolderDto.of(dto.buyer),
      dto.lines.map(line => ({ itemTypeId: line.itemTypeId, amount: line.amount })),
      { factors: PriceFactorSelectionDto.of(dto.factors), trading: TradingRequestDto.of(dto.trading) },
      userId,
      roles,
    );
  }
}

export class PurchaseItemDto {
  @ApiProperty({ type: ItemHolderDto, description: 'The character or faction that buys' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  buyer: ItemHolderDto;

  @ApiProperty({ example: 'longsword' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  @ApiProperty({ required: false, description: 'Checked against the game of the buyer' })
  @IsString()
  @IsOptional()
  gameId?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false, description: 'Asked gold of one unit; by default the average cost', example: 25 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ enum: PAYER_MODES, required: false, description: 'A character pays with its coins, its faction, or both' })
  @IsIn(PAYER_MODES)
  @IsOptional()
  payer?: PayerMode;

  @ApiProperty({ type: TradingRequestDto, required: false })
  @ValidateNested()
  @Type(() => TradingRequestDto)
  @IsOptional()
  trading?: TradingRequestDto;

  @ApiProperty({ required: false, example: 'Narsil' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: WEAPON_WIELDER_SIZES })
  @IsIn(WEAPON_WIELDER_SIZES)
  @IsOptional()
  wielderSize?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  carried?: boolean;

  static toCommand(dto: PurchaseItemDto, userId: string, roles: string[]): PurchaseItemCommand {
    return new PurchaseItemCommand(
      ItemHolderDto.of(dto.buyer)!,
      dto.itemTypeId,
      {
        gameId: dto.gameId,
        amount: dto.amount,
        unitPrice: dto.unitPrice,
        payer: dto.payer,
        trading: TradingRequestDto.of(dto.trading),
        name: dto.name,
        description: dto.description,
        wielderSize: dto.wielderSize,
        carried: dto.carried,
      },
      userId,
      roles,
    );
  }
}

export class SellItemDto {
  @ApiProperty({ required: false, description: 'Units of a stack; by default all of them' })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false, description: 'Asked gold of one unit, instead of the computed one' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ required: false, description: 'Percent of the value paid (house rule, 50 by default)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePercent?: number;

  @ApiProperty({ type: [PriceFactorSelectionDto], required: false, description: 'Market conditions of the expected price (spec 048)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceFactorSelectionDto)
  @IsOptional()
  factors?: PriceFactorSelectionDto[];

  @ApiProperty({ type: TradingRequestDto, required: false })
  @ValidateNested()
  @Type(() => TradingRequestDto)
  @IsOptional()
  trading?: TradingRequestDto;

  static toCommand(itemId: string, dto: SellItemDto, userId: string, roles: string[]): SellItemCommand {
    return new SellItemCommand(
      itemId,
      {
        amount: dto.amount,
        unitPrice: dto.unitPrice,
        salePercent: dto.salePercent,
        factors: PriceFactorSelectionDto.of(dto.factors),
        trading: TradingRequestDto.of(dto.trading),
      },
      userId,
      roles,
    );
  }
}

export class TransferItemDto {
  @ApiProperty({ type: ItemHolderDto })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  to: ItemHolderDto;

  @ApiProperty({ required: false, description: 'Units of a stack; by default all of them' })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  static toCommand(itemId: string, dto: TransferItemDto, userId: string, roles: string[]): TransferItemCommand {
    return new TransferItemCommand(itemId, ItemHolderDto.of(dto.to)!, dto.amount, userId, roles);
  }
}

export class DiscardItemDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false, example: 'Lost in the river' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;

  static toCommand(itemId: string, dto: DiscardItemDto, userId: string, roles: string[]): DiscardItemCommand {
    return new DiscardItemCommand(itemId, dto.amount, dto.note, userId, roles);
  }
}

/** `POST /v1/items/:id/coating` (workspace spec 042). */
export class CoatItemDto {
  @ApiProperty({ description: 'Liquid or paste poison of the same holder: one dose is spent' })
  @IsString()
  @MaxLength(100)
  poisonItemId: string;

  static toCommand(itemId: string, dto: CoatItemDto, userId: string, roles: string[]): CoatItemCommand {
    return new CoatItemCommand(itemId, dto.poisonItemId, userId, roles);
  }
}

export class ItemManeuverDto {
  @ApiProperty({ required: false, description: 'Character who rolls (required to craft)' })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiProperty({ required: false, example: 'metalcraft' })
  @IsString()
  @IsOptional()
  skillId?: string;

  @ApiProperty({ required: false, example: 'weapon-smith' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiProperty({ required: false, description: 'Skill bonus typed by hand; by default the one of the sheet' })
  @IsNumber()
  @IsOptional()
  bonus?: number;

  @ApiProperty({ required: false, enum: DIFFICULTIES })
  @IsIn(DIFFICULTIES)
  @IsOptional()
  difficulty?: Difficulty;

  @ApiProperty({ type: [RollModifierDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RollModifierDto)
  @IsOptional()
  modifiers?: RollModifierDto[];

  @ApiProperty({ example: 95 })
  @IsNumber()
  roll: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  unmodifiedRoll?: number;
}

export class CraftingEnhancementDto {
  @ApiProperty({ enum: ITEM_MODIFIER_TARGETS, example: 'attack' })
  @IsIn(ITEM_MODIFIER_TARGETS)
  appliesTo: ItemModifierTarget;

  @ApiProperty({ example: 5 })
  @IsNumber()
  value: number;

  @ApiProperty({ required: false, example: 'Dwarven steel' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;
}

/** Workspace spec 043, decision 2: the quality the craftsman aims at. */
export class CraftingQualityDto {
  @ApiProperty({ required: false, description: 'Superior material of rmu-api-core', example: 'high-steel' })
  @IsString()
  @IsOptional()
  materialId?: string;

  @ApiProperty({ required: false, description: 'A blunt weapon: some metals give it another bonus' })
  @IsBoolean()
  @IsOptional()
  blunt?: boolean;

  @ApiProperty({ required: false, description: 'Wood or stone in place of the metal the item is normally made of' })
  @IsBoolean()
  @IsOptional()
  replacesMetal?: boolean;

  @ApiProperty({ required: false, enum: MASTERWORK_KINDS, description: 'Superior craftsmanship: +5 on an absolute success' })
  @IsIn(MASTERWORK_KINDS)
  @IsOptional()
  masterwork?: MasterworkKind;

  @ApiProperty({ required: false, description: 'Circumstance of a circumstantial masterwork', example: 'vs. rigid leather' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  circumstance?: string;

  @ApiProperty({ required: false, enum: ARMOR_WEIGHT_PERCENTS, description: 'Torso armor weight change, in percent' })
  @IsIn(ARMOR_WEIGHT_PERCENTS)
  @IsOptional()
  weightPercent?: number;

  @ApiProperty({ required: false, enum: WORKSHOP_QUALITIES, description: 'Quality of the workshop; basic by default' })
  @IsIn(WORKSHOP_QUALITIES)
  @IsOptional()
  workshop?: WorkshopQuality;

  static of(dto: CraftingQualityDto | undefined): CraftingQuality | undefined {
    return dto ? { ...dto } : undefined;
  }
}

/** Workspace spec 043, decision 3: the plan of a craft without rolling or paying. */
export class QuoteCraftDto {
  @ApiProperty({ example: 'broadsword' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  @ApiProperty({ type: CraftingQualityDto, required: false })
  @ValidateNested()
  @Type(() => CraftingQualityDto)
  @IsOptional()
  quality?: CraftingQualityDto;

  @ApiProperty({ required: false, description: 'Gold of the materials typed by the game master' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  materialsCost?: number;

  @ApiProperty({ required: false, description: 'Extra gold of the enhancements' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  enhancementsCost?: number;

  static toQuery(dto: QuoteCraftDto, userId: string, roles: string[]): QuoteCraftQuery {
    return new QuoteCraftQuery(
      dto.itemTypeId,
      {
        amount: dto.amount,
        quality: CraftingQualityDto.of(dto.quality),
        materialsCost: dto.materialsCost,
        enhancementsCost: dto.enhancementsCost,
      },
      userId,
      roles,
    );
  }
}

export class CraftItemDto {
  @ApiProperty({ example: 'longsword' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  @ApiProperty({ type: ItemManeuverDto, description: 'The Crafting maneuver; actorId is the craftsman' })
  @ValidateNested()
  @Type(() => ItemManeuverDto)
  maneuver: ItemManeuverDto;

  @ApiProperty({ type: ItemHolderDto, required: false, description: 'Who gets the item; by default the craftsman' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  @IsOptional()
  to?: ItemHolderDto;

  @ApiProperty({ type: ItemHolderDto, required: false, description: 'Who pays the materials; by default who gets the item' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  @IsOptional()
  payer?: ItemHolderDto;

  @ApiProperty({ required: false, description: 'Nobody pays the materials' })
  @IsBoolean()
  @IsOptional()
  free?: boolean;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false, description: 'Gold of the materials; by default a percent of the average cost' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  materialsCost?: number;

  @ApiProperty({ type: [CraftingEnhancementDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CraftingEnhancementDto)
  @IsOptional()
  enhancements?: CraftingEnhancementDto[];

  @ApiProperty({ required: false, description: 'Extra gold of the enhancements' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  enhancementsCost?: number;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: WEAPON_WIELDER_SIZES })
  @IsIn(WEAPON_WIELDER_SIZES)
  @IsOptional()
  wielderSize?: string;

  @ApiProperty({ type: CraftingQualityDto, required: false, description: 'Material, masterwork, armor weight and workshop (spec 043)' })
  @ValidateNested()
  @Type(() => CraftingQualityDto)
  @IsOptional()
  quality?: CraftingQualityDto;

  static toCommand(dto: CraftItemDto, userId: string, roles: string[]): CraftItemCommand {
    return new CraftItemCommand(
      dto.itemTypeId,
      { ...maneuverOf(dto.maneuver), actorId: dto.maneuver.actorId ?? '' },
      {
        to: ItemHolderDto.of(dto.to),
        payer: dto.free ? null : ItemHolderDto.of(dto.payer),
        amount: dto.amount,
        materialsCost: dto.materialsCost,
        enhancements: (dto.enhancements ?? []).map(enhancement => ({
          appliesTo: enhancement.appliesTo,
          value: enhancement.value,
          ...(enhancement.description ? { description: enhancement.description } : {}),
        })),
        enhancementsCost: dto.enhancementsCost,
        name: dto.name,
        description: dto.description,
        wielderSize: dto.wielderSize,
        quality: CraftingQualityDto.of(dto.quality),
      },
      userId,
      roles,
    );
  }
}

export class RepairItemDto {
  @ApiProperty({ type: ItemManeuverDto, description: 'The repair maneuver; actorId is the repairer (optional)' })
  @ValidateNested()
  @Type(() => ItemManeuverDto)
  maneuver: ItemManeuverDto;

  @ApiProperty({ required: false, description: 'Gold of the repair (materials, a craftsman...)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiProperty({ type: ItemHolderDto, required: false, description: 'Who pays the cost; by default the holder' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  @IsOptional()
  payer?: ItemHolderDto;

  static toCommand(itemId: string, dto: RepairItemDto, userId: string, roles: string[]): RepairItemCommand {
    return new RepairItemCommand(itemId, maneuverOf(dto.maneuver), { cost: dto.cost, payer: ItemHolderDto.of(dto.payer) }, userId, roles);
  }
}

const PRICE_KINDS: PriceKind[] = ['purchase', 'sale'];

export class QuotePriceDto {
  @ApiProperty({ enum: PRICE_KINDS })
  @IsIn(PRICE_KINDS)
  kind: PriceKind;

  @ApiProperty({ required: false, description: 'Purchase: the item type' })
  @IsString()
  @IsOptional()
  itemTypeId?: string;

  @ApiProperty({ required: false, description: 'Sale: the item' })
  @IsString()
  @IsOptional()
  itemId?: string;

  @ApiProperty({ type: ItemHolderDto, required: false, description: 'Buyer or seller, for its Trading bonus' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  @IsOptional()
  holder?: ItemHolderDto;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePercent?: number;

  @ApiProperty({ type: [PriceFactorSelectionDto], required: false, description: 'Market conditions of the expected price (spec 048)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceFactorSelectionDto)
  @IsOptional()
  factors?: PriceFactorSelectionDto[];

  @ApiProperty({ type: TradingRequestDto, required: false })
  @ValidateNested()
  @Type(() => TradingRequestDto)
  @IsOptional()
  trading?: TradingRequestDto;

  static toQuery(dto: QuotePriceDto, userId: string, roles: string[]): QuotePriceQuery {
    return new QuotePriceQuery(
      dto.kind,
      {
        itemTypeId: dto.itemTypeId,
        itemId: dto.itemId,
        holder: ItemHolderDto.of(dto.holder),
        amount: dto.amount,
        unitPrice: dto.unitPrice,
        salePercent: dto.salePercent,
        factors: PriceFactorSelectionDto.of(dto.factors),
        trading: TradingRequestDto.of(dto.trading),
      },
      userId,
      roles,
    );
  }
}

function maneuverOf(dto: ItemManeuverDto) {
  return {
    ...(dto.actorId ? { actorId: dto.actorId } : {}),
    ...(dto.skillId ? { skillId: dto.skillId } : {}),
    ...(dto.specialization ? { specialization: dto.specialization } : {}),
    ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
    ...(dto.difficulty ? { difficulty: dto.difficulty } : {}),
    ...(dto.modifiers ? { modifiers: dto.modifiers.map(modifier => ({ key: modifier.key, value: modifier.value })) } : {}),
    roll: dto.roll,
    ...(dto.unmodifiedRoll !== undefined ? { unmodifiedRoll: dto.unmodifiedRoll } : {}),
  };
}

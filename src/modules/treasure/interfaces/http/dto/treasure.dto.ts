import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { POWER_LEVELS, type PowerLevel } from '../../../../enchantments/domain/value-objects/alchemy.vo.js';
import { ItemDto } from '../../../../items/interfaces/http/dto/item.dto.js';
import { ItemHolderDto } from '../../../../items/interfaces/http/dto/item-operations.dto.js';
import { MagicItemRequestDto } from '../../../../items/interfaces/http/dto/magic-item.dto.js';
import type { Item } from '../../../../items/domain/aggregates/item.js';
import { JEWELRY_CLASSES, type JewelryClass } from '../../../../items/domain/services/item-unit-value.js';
import { TREASURE_QUALITIES, type TreasureQuality } from '../../../../items/domain/value-objects/treasure-tables.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { AwardTreasureCommand, RollTreasureQuery } from '../../../application/cqrs/commands/treasure.commands.js';
import { MAX_AWARD_LINES } from '../../../application/cqrs/handlers/treasure.handlers.js';
import type { TreasureDie, TreasureLine } from '../../../domain/services/treasure-generator.js';

const LINE_KINDS = ['gold', 'item', 'note'] as const;
const MAX_TREASURE_DICE = 500;

export class TreasureRollRequestDto {
  @ApiProperty({ required: false, nullable: true, type: String, description: 'Codes of the book, e.g. "c, n, x"', example: 'c, n, x' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  codes?: string | null;

  @ApiProperty({ required: false, enum: TREASURE_QUALITIES, isArray: true, description: 'Wealth qualities, added to the codes' })
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(TREASURE_QUALITIES, { each: true })
  @IsOptional()
  wealth?: TreasureQuality[];

  @ApiProperty({ required: false, enum: TREASURE_QUALITIES, isArray: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(TREASURE_QUALITIES, { each: true })
  @IsOptional()
  lifestyle?: TreasureQuality[];

  @ApiProperty({ required: false, enum: TREASURE_QUALITIES, isArray: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(TREASURE_QUALITIES, { each: true })
  @IsOptional()
  magic?: TreasureQuality[];

  @ApiProperty({ required: false, description: 'Sum of the modifiers of 7-1c', example: 10 })
  @IsNumber()
  @IsOptional()
  wealthModifier?: number;

  @ApiProperty({ required: false, nullable: true, type: String })
  @IsString()
  @IsOptional()
  gameId?: string | null;

  @ApiProperty({ required: false, enum: POWER_LEVELS, description: 'Adds the 7-1c modifier power-<level> of the tables' })
  @IsIn(POWER_LEVELS)
  @IsOptional()
  powerLevel?: PowerLevel;

  @ApiProperty({
    required: false,
    type: [Number],
    description: 'The dice rolled by the client so far, in order. The answer has `pending` while another one is needed',
    example: [45, 12],
  })
  @IsArray()
  @ArrayMaxSize(MAX_TREASURE_DICE)
  @IsInt({ each: true })
  @IsOptional()
  dice?: number[];

  static toQuery(dto: TreasureRollRequestDto, userId: string, roles: string[]): RollTreasureQuery {
    return new RollTreasureQuery(
      {
        codes: dto.codes ?? null,
        wealth: dto.wealth ?? [],
        lifestyle: dto.lifestyle ?? [],
        magic: dto.magic ?? [],
        wealthModifier: dto.wealthModifier ?? 0,
        gameId: dto.gameId ?? null,
        powerLevel: dto.powerLevel ?? null,
        dice: dto.dice ?? [],
      },
      userId,
      roles,
    );
  }
}

export class TreasureLineDto {
  @ApiProperty({ enum: LINE_KINDS })
  @IsIn(LINE_KINDS)
  kind: (typeof LINE_KINDS)[number];

  @ApiProperty({ required: false, description: 'gold: the gold' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  gold?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  itemTypeId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, nullable: true, type: Number })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  amount?: number | null;

  @ApiProperty({ required: false, description: 'Gold of one unit' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiProperty({ required: false, nullable: true, type: Number })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  carats?: number | null;

  @ApiProperty({ required: false, nullable: true, enum: JEWELRY_CLASSES })
  @IsIn(JEWELRY_CLASSES)
  @IsOptional()
  jewelryClass?: JewelryClass | null;

  @ApiProperty({ required: false, nullable: true, type: String, description: 'Size of a random weapon' })
  @IsString()
  @IsOptional()
  size?: string | null;

  @ApiProperty({ required: false, nullable: true, type: MagicItemRequestDto })
  @ValidateNested()
  @Type(() => MagicItemRequestDto)
  @IsOptional()
  magic?: MagicItemRequestDto | null;

  @ApiProperty({ required: false, description: 'note: its text' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ required: false, type: [Object], description: 'The dice of the roll, kept as information' })
  @IsArray()
  @IsOptional()
  dice?: TreasureDie[];

  static line(dto: TreasureLineDto): TreasureLine {
    switch (dto.kind) {
      case 'gold':
        if (dto.gold === undefined) throw new ValidationError('A gold line needs its gold', 'err-treasure-award-invalid');
        return { kind: 'gold', gold: dto.gold, dice: [] };
      case 'note':
        return { kind: 'note', text: dto.text ?? '', dice: [] };
      case 'item':
        if (!dto.itemTypeId || dto.value === undefined) {
          throw new ValidationError('An item line needs its item type and value', 'err-treasure-award-invalid');
        }
        return {
          kind: 'item',
          itemTypeId: dto.itemTypeId,
          name: dto.name || dto.itemTypeId,
          amount: dto.amount ?? null,
          value: dto.value,
          carats: dto.carats ?? null,
          jewelryClass: dto.jewelryClass ?? null,
          size: dto.size ?? null,
          magic: dto.magic ? MagicItemRequestDto.request(dto.magic) : null,
          dice: [],
        };
    }
  }
}

export class TreasureAwardDto {
  @ApiProperty({ example: 'strategic-game-001' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ type: ItemHolderDto, description: 'The faction or character that gets the treasure' })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  holder: ItemHolderDto;

  @ApiProperty({ type: [TreasureLineDto] })
  @IsArray()
  @ArrayMaxSize(MAX_AWARD_LINES)
  @ValidateNested({ each: true })
  @Type(() => TreasureLineDto)
  lines: TreasureLineDto[];

  static toCommand(dto: TreasureAwardDto, userId: string, roles: string[]): AwardTreasureCommand {
    return new AwardTreasureCommand(
      dto.gameId,
      ItemHolderDto.of(dto.holder)!,
      dto.lines.map(line => TreasureLineDto.line(line)),
      userId,
      roles,
    );
  }
}

export class TreasureAwardResultDto {
  @ApiProperty({ type: [ItemDto] })
  items: ItemDto[];

  @ApiProperty({ description: 'Gold given to the holder' })
  gold: number;

  static of(result: { items: Item[]; gold: number }): TreasureAwardResultDto {
    return Object.assign(new TreasureAwardResultDto(), { items: result.items.map(item => ItemDto.fromEntity(item)), gold: result.gold });
  }
}

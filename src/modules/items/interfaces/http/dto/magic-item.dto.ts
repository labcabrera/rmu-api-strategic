import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { POWER_LEVELS, type PowerLevel } from '../../../../enchantments/domain/value-objects/alchemy.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import {
  ChangeItemChargesCommand,
  CreateMagicItemCommand,
  QuoteMagicItemQuery,
} from '../../../application/cqrs/commands/magic-item.commands.js';
import type { MagicItemRequest } from '../../../application/services/magic-items.service.js';
import { STANDARD_MAGIC_TABLES, type StandardMagicTable } from '../../../domain/services/magic-item-pricing.js';
import { MAGIC_BONUS_KINDS, type MagicBonusKind } from '../../../domain/value-objects/item-catalog-info.vo.js';
import {
  MAGIC_ITEM_KINDS,
  MAGIC_SPELL_USES,
  type MagicItemKind,
  type MagicSpellUse,
} from '../../../domain/value-objects/item-enchantment.vo.js';
import { ITEM_HOLDER_KINDS, type ItemHolder } from '../../../domain/value-objects/item-holder.vo.js';
import type { MagicItemQuote } from '../../../domain/services/magic-item-pricing.js';

export class MagicItemBonusDto {
  @ApiProperty({ enum: MAGIC_BONUS_KINDS, example: 'ob' })
  @IsIn(MAGIC_BONUS_KINDS)
  kind: MagicBonusKind;

  @ApiProperty({ example: 10 })
  @IsNumber()
  value: number;

  @ApiProperty({ required: false, nullable: true, type: String, description: 'Skill, stat, realm... of the bonus' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  target?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String, description: 'Creature type it applies against (7-1k)' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  against?: string | null;
}

export class MagicItemSpellDto {
  @ApiProperty({ example: 'Shock Bolt' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @Max(100)
  level: number;

  @ApiProperty({ required: false, nullable: true, type: String, description: 'Code of the spell list' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  list?: string | null;

  @ApiProperty({ enum: MAGIC_SPELL_USES, example: 'daily' })
  @IsIn(MAGIC_SPELL_USES)
  use: MagicSpellUse;

  @ApiProperty({ required: false, nullable: true, type: Number })
  @IsInt()
  @Min(0)
  @IsOptional()
  perDay?: number | null;
}

export class StandardMagicRequestDto {
  @ApiProperty({ enum: STANDARD_MAGIC_TABLES, example: 'weapon' })
  @IsIn(STANDARD_MAGIC_TABLES)
  table: StandardMagicTable;

  @ApiProperty({ example: 10 })
  @IsInt()
  bonus: number;

  @ApiProperty({ required: false, nullable: true, type: String, description: 'Material of a general bonus: wood, metal or leather' })
  @IsString()
  @IsOptional()
  material?: string | null;
}

/** `MagicItemRequest` of workspace spec 067, plan section 3. */
export class MagicItemRequestDto {
  @ApiProperty({ example: 'longsword' })
  @IsString()
  @IsNotEmpty()
  baseItemTypeId: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string | null;

  @ApiProperty({ enum: MAGIC_ITEM_KINDS, example: 'weapon' })
  @IsIn(MAGIC_ITEM_KINDS)
  kind: MagicItemKind;

  @ApiProperty({ required: false, nullable: true, type: Number })
  @IsInt()
  @Min(0)
  @IsOptional()
  itemLevel?: number | null;

  @ApiProperty({ type: [MagicItemBonusDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MagicItemBonusDto)
  bonuses: MagicItemBonusDto[];

  @ApiProperty({ type: [MagicItemSpellDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MagicItemSpellDto)
  spells: MagicItemSpellDto[];

  @ApiProperty({ required: false, nullable: true, type: Number, description: 'Maximum charges' })
  @IsInt()
  @Min(1)
  @IsOptional()
  charges?: number | null;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  attunement?: boolean;

  @ApiProperty({ required: false, nullable: true, type: Number, description: 'Gold of one unit; without it, the quote' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number | null;

  @ApiProperty({ required: false, nullable: true, type: StandardMagicRequestDto, description: 'A standard enhancement of chapter 6' })
  @ValidateNested()
  @Type(() => StandardMagicRequestDto)
  @IsOptional()
  standard?: StandardMagicRequestDto | null;

  @ApiProperty({ enum: POWER_LEVELS, required: false, description: 'Power level of the campaign: multiplies the magic part' })
  @IsIn(POWER_LEVELS)
  @IsOptional()
  powerLevel?: PowerLevel;

  static request(dto: MagicItemRequestDto): MagicItemRequest {
    return {
      baseItemTypeId: dto.baseItemTypeId,
      name: dto.name ?? null,
      kind: dto.kind,
      itemLevel: dto.itemLevel ?? null,
      bonuses: (dto.bonuses ?? []).map(bonus => ({
        kind: bonus.kind,
        value: bonus.value,
        target: bonus.target ?? null,
        against: bonus.against ?? null,
      })),
      spells: (dto.spells ?? []).map(spell => ({
        name: spell.name,
        level: spell.level,
        list: spell.list ?? null,
        use: spell.use,
        perDay: spell.perDay ?? null,
      })),
      charges: dto.charges ?? null,
      attunement: dto.attunement ?? false,
      price: dto.price ?? null,
      standard: dto.standard ? { table: dto.standard.table, bonus: dto.standard.bonus, material: dto.standard.material ?? null } : null,
    };
  }

  static toQuery(dto: MagicItemRequestDto, userId: string, roles: string[]): QuoteMagicItemQuery {
    return new QuoteMagicItemQuery(MagicItemRequestDto.request(dto), dto.powerLevel, userId, roles);
  }
}

export class CreateMagicItemDto extends MagicItemRequestDto {
  @ApiProperty({ example: 'strategic-game-001' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  factionId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  characterId?: string;

  @ApiProperty({
    required: false,
    description: "'none' (default): a gift; or a holder `{ kind, id }` of the game that pays the price",
    oneOf: [{ type: 'string', enum: ['none'] }, { type: 'object' }],
  })
  @IsOptional()
  payer?: 'none' | { kind: string; id: string };

  static toCommand(dto: CreateMagicItemDto, userId: string, roles: string[]): CreateMagicItemCommand {
    if (!!dto.factionId === !!dto.characterId) {
      throw new ValidationError('Either factionId or characterId must be specified', 'err-item-holder-required');
    }
    const holder: ItemHolder = dto.characterId ? { kind: 'character', id: dto.characterId } : { kind: 'faction', id: dto.factionId! };
    return new CreateMagicItemCommand(
      MagicItemRequestDto.request(dto),
      dto.gameId,
      holder,
      CreateMagicItemDto.payer(dto.payer),
      dto.powerLevel,
      userId,
      roles,
    );
  }

  static payer(payer: unknown): ItemHolder | null {
    if (payer === undefined || payer === null || payer === 'none') return null;
    const candidate = payer as { kind?: unknown; id?: unknown };
    if (
      typeof candidate === 'object' &&
      (ITEM_HOLDER_KINDS as unknown[]).includes(candidate.kind) &&
      typeof candidate.id === 'string' &&
      candidate.id.length > 0
    ) {
      return { kind: candidate.kind as ItemHolder['kind'], id: candidate.id };
    }
    throw new ValidationError("payer is 'none' or a holder { kind, id }", 'validation');
  }
}

export class MagicItemQuoteDto {
  @ApiProperty({ example: 7 })
  days: number;

  @ApiProperty({ example: 5 })
  itemLevel: number;

  @ApiProperty({ description: 'Gold of one unit, base item included', example: 25.5 })
  price: number;

  @ApiProperty({ type: [String], description: 'How the price was made, for the game master' })
  breakdown: string[];

  static of(quote: MagicItemQuote): MagicItemQuoteDto {
    return Object.assign(new MagicItemQuoteDto(), quote);
  }
}

export class ChangeItemChargesDto {
  @ApiProperty({ required: false, description: 'Charges to add; negative spends them', example: -1 })
  @IsInt()
  @IsOptional()
  delta?: number;

  @ApiProperty({ required: false, description: 'Fill the item: costs its holder 2 sp per day of recharge' })
  @IsBoolean()
  @IsOptional()
  recharge?: boolean;

  static toCommand(itemId: string, dto: ChangeItemChargesDto, userId: string, roles: string[]): ChangeItemChargesCommand {
    const recharge = dto.recharge === true;
    if (recharge === (dto.delta !== undefined && dto.delta !== null)) {
      throw new ValidationError('Send either delta or recharge: true', 'err-item-charges-invalid');
    }
    return new ChangeItemChargesCommand(itemId, recharge ? { recharge: true } : { delta: dto.delta! }, userId, roles);
  }
}

export class CutGemDto {
  @ApiProperty({ enum: [5, 10], example: 5 })
  @IsIn([5, 10])
  cutFactor: number;
}

export class SetGemDto {
  @ApiProperty({ example: 'item-gem-001' })
  @IsString()
  @IsNotEmpty()
  gemItemId: string;
}

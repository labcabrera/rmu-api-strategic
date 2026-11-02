import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ItemHolderDto } from '../../../../items/interfaces/http/dto/item-operations.dto.js';
import {
  CreateEnchantmentCommand,
  ProgressEnchantmentCommand,
  SendEnchantmentFailureRollsCommand,
  UpdateEnchantmentCommand,
} from '../../../application/cqrs/commands/enchantment.commands.js';
import { QuoteEnchantmentQuery } from '../../../application/cqrs/queries/enchantment.queries.js';
import type { EnchantmentRequest } from '../../../domain/aggregates/enchantment-project.js';
import { ENCHANTMENT_SCOPES, type EnchantmentScope } from '../../../domain/services/enchantment-planner.js';
import { POWER_LEVELS, type PowerLevel } from '../../../domain/value-objects/alchemy.vo.js';

/** Spells an enchantment may embed. */
const MAX_SPELLS = 30;

export class EnchantmentSpellRequestDto {
  @ApiProperty({ description: 'Spell of rmu-api-spells the alchemist knows', example: 'spell-001' })
  @IsString()
  @IsNotEmpty()
  spellId: string;

  @ApiProperty({ enum: ENCHANTMENT_SCOPES, required: false, default: 'normal' })
  @IsIn(ENCHANTMENT_SCOPES)
  @IsOptional()
  scope?: EnchantmentScope;

  @ApiProperty({ description: 'Skill of a skill bonus', required: false, nullable: true, example: 'perception' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  target?: string | null;
}

export class EnchantmentRequestDto {
  @ApiProperty({ description: 'Character that enchants', example: 'character-001' })
  @IsString()
  @IsNotEmpty()
  alchemistId: string;

  @ApiProperty({ description: 'Item of the same game', example: 'item-001' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ type: [EnchantmentSpellRequestDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SPELLS)
  @ValidateNested({ each: true })
  @Type(() => EnchantmentSpellRequestDto)
  spells: EnchantmentSpellRequestDto[];

  @ApiProperty({ description: 'Units of the batch: the item must be a stack of exactly that many', required: false, default: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  batchSize?: number;

  @ApiProperty({ enum: POWER_LEVELS, required: false, default: 'superior' })
  @IsIn(POWER_LEVELS)
  @IsOptional()
  powerLevel?: PowerLevel;

  static request(dto: EnchantmentRequestDto): EnchantmentRequest {
    return {
      alchemistId: dto.alchemistId,
      itemId: dto.itemId,
      spells: dto.spells.map(spell => ({
        spellId: spell.spellId,
        ...(spell.scope ? { scope: spell.scope } : {}),
        ...(spell.target !== undefined ? { target: spell.target } : {}),
      })),
      ...(dto.batchSize !== undefined ? { batchSize: dto.batchSize } : {}),
      ...(dto.powerLevel ? { powerLevel: dto.powerLevel } : {}),
    };
  }

  static toQuery(dto: EnchantmentRequestDto, userId: string, roles: string[]): QuoteEnchantmentQuery {
    return new QuoteEnchantmentQuery(EnchantmentRequestDto.request(dto), userId, roles);
  }
}

export class CreateEnchantmentDto extends EnchantmentRequestDto {
  @ApiProperty({
    description: 'Open-ended SCR roll of each spell, by spell id',
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { 'spell-001': 45 },
  })
  @IsObject()
  scrRolls: Record<string, number>;

  @ApiProperty({
    type: ItemHolderDto,
    required: false,
    nullable: true,
    description: 'Who pays the materials: by default the holder of the item; null, nobody',
  })
  @ValidateNested()
  @Type(() => ItemHolderDto)
  @IsOptional()
  payer?: ItemHolderDto | null;

  static toCommand(dto: CreateEnchantmentDto, userId: string, roles: string[]): CreateEnchantmentCommand {
    const payer = dto.payer === null ? null : ItemHolderDto.of(dto.payer);
    return new CreateEnchantmentCommand(EnchantmentRequestDto.request(dto), dto.scrRolls, payer, userId, roles);
  }
}

export class EnchantmentFailureRollsDto {
  @ApiProperty({
    description: 'Open-ended failure roll of each failed spell, by spell id',
    type: 'object',
    additionalProperties: { type: 'integer' },
    example: { 'spell-001': 66 },
  })
  @IsObject()
  rolls: Record<string, number>;

  static toCommand(id: string, dto: EnchantmentFailureRollsDto, userId: string, roles: string[]): SendEnchantmentFailureRollsCommand {
    return new SendEnchantmentFailureRollsCommand(id, dto.rolls, userId, roles);
  }
}

export class ProgressEnchantmentDto {
  @ApiProperty({ description: 'Days worked', minimum: 1, example: 3 })
  @IsInt()
  @Min(1)
  @Max(10000)
  days: number;

  static toCommand(id: string, dto: ProgressEnchantmentDto, userId: string, roles: string[]): ProgressEnchantmentCommand {
    return new ProgressEnchantmentCommand(id, dto.days, userId, roles);
  }
}

export class UpdateEnchantmentDto {
  @ApiProperty({ description: 'Extra days of the failure results (total)', required: false, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  extraDays?: number;

  @ApiProperty({ description: 'Extra gold of the failure results (total), charged to the payer', required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  extraCost?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  notes?: string | null;

  @ApiProperty({ description: 'Version read: a stale one is a 409 version-conflict', required: false })
  @IsInt()
  @IsOptional()
  version?: number;

  static toCommand(id: string, dto: UpdateEnchantmentDto, userId: string, roles: string[]): UpdateEnchantmentCommand {
    return new UpdateEnchantmentCommand(
      id,
      {
        ...(dto.extraDays !== undefined ? { extraDays: dto.extraDays } : {}),
        ...(dto.extraCost !== undefined ? { extraCost: dto.extraCost } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
      },
      userId,
      roles,
    );
  }
}

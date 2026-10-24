import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { AddItemModifierCommand } from '../../../application/cqrs/commands/item-modifier.commands';
import {
  ITEM_MODIFIER_TARGETS,
  ITEM_MODIFIER_TYPES,
  type ItemCondition,
  type ItemModifier,
  type ItemModifierSource,
  type ItemModifierTarget,
  type ItemModifierType,
} from '../../../domain/value-objects/item-modifier.vo';

export class ItemModifierDto {
  @ApiProperty({ description: 'Modifier identifier (the same in tactical and strategic)', example: 'b5f0c7e2-...' })
  id: string;

  @ApiProperty({ type: String, enum: ITEM_MODIFIER_TYPES, example: 'breakage' })
  type: ItemModifierType;

  @ApiProperty({ description: 'Bonus (positive) or penalty (negative)', example: -20 })
  value: number;

  @ApiProperty({ type: String, enum: ITEM_MODIFIER_TARGETS, example: 'all' })
  appliesTo: ItemModifierTarget;

  @ApiProperty({ description: 'Breakage only: the item is broken', required: false })
  broken?: boolean;

  @ApiProperty({ description: 'Where the modifier comes from', required: false })
  source?: ItemModifierSource;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ example: '2026-10-24T10:00:00.000Z' })
  createdAt: string;

  static fromEntity(entity: ItemModifier): ItemModifierDto {
    const dto = new ItemModifierDto();
    Object.assign(dto, entity);
    return dto;
  }
}

export class ItemConditionDto {
  @ApiProperty({ description: 'Sum of the breakage modifiers (0 or negative)', example: -20 })
  breakagePenalty: number;

  @ApiProperty({ description: 'The item is broken', example: false })
  broken: boolean;

  static fromEntity(entity: ItemCondition): ItemConditionDto {
    const dto = new ItemConditionDto();
    dto.breakagePenalty = entity.breakagePenalty;
    dto.broken = entity.broken;
    return dto;
  }
}

export class AddItemModifierDto {
  @ApiProperty({ type: String, enum: ITEM_MODIFIER_TYPES, example: 'quality' })
  @IsIn(ITEM_MODIFIER_TYPES)
  type: ItemModifierType;

  @ApiProperty({ description: 'Bonus (positive) or penalty (negative)', example: 10 })
  @IsNumber()
  value: number;

  @ApiProperty({ type: String, enum: ITEM_MODIFIER_TARGETS, example: 'breakage' })
  @IsIn(ITEM_MODIFIER_TARGETS)
  appliesTo: ItemModifierTarget;

  @ApiProperty({ description: 'Breakage only: the item is broken', required: false })
  @IsBoolean()
  @IsOptional()
  broken?: boolean;

  @ApiProperty({ required: false, example: 'Dwarven steel' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  static toCommand(itemId: string, dto: AddItemModifierDto, userId: string, roles: string[]): AddItemModifierCommand {
    return new AddItemModifierCommand(itemId, dto.type, dto.value, dto.appliesTo, dto.broken, dto.description, userId, roles);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import type { ItemHolder } from '../../../../items/domain/value-objects/item-holder.vo.js';
import { ItemDto } from '../../../../items/interfaces/http/dto/item.dto.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import type { EnchantmentCompletion } from '../../../application/cqrs/handlers/complete-enchantment.handler.js';
import {
  ENCHANTMENT_STATUSES,
  type EnchantmentFailure,
  type EnchantmentProject,
  type EnchantmentRequest,
  type EnchantmentScr,
  type EnchantmentStatus,
} from '../../../domain/aggregates/enchantment-project.js';
import {
  ENCHANTMENT_SCOPES,
  type EnchantmentPlan,
  type EnchantmentPlanSpell,
  type EnchantmentScope,
  type ScrModifier,
} from '../../../domain/services/enchantment-planner.js';
import {
  ALCHEMY_FAILURE_TABLES,
  type AlchemyFailureTable,
  POWER_LEVELS,
  type PowerLevel,
  type SpellAlchemyEffect,
} from '../../../domain/value-objects/alchemy.vo.js';

export class ScrModifierDto {
  @ApiProperty({ example: 'ranks' })
  key: string;

  @ApiProperty({ example: 10 })
  value: number;
}

export class EnchantmentPlanSpellDto {
  @ApiProperty() spellId: string;
  @ApiProperty() name: string;
  @ApiProperty() level: number;
  @ApiProperty() listId: string;
  @ApiProperty() listCode: string;
  @ApiProperty({ example: 'base-spell-list' }) listSkillId: string;
  @ApiProperty({ nullable: true, example: 'alchemical' }) type: string | null;
  @ApiProperty({ enum: ENCHANTMENT_SCOPES }) scope: EnchantmentScope;
  @ApiProperty({ description: 'Working days it adds: level × scope, rounded up' }) days: number;
  @ApiProperty({ description: 'PP of each cast' }) pp: number;
  @ApiProperty({ description: 'Casts a day: the batch size when it is cast per unit' }) casts: number;
  @ApiProperty() perItem: boolean;
  @ApiProperty({ enum: ALCHEMY_FAILURE_TABLES }) failureTable: AlchemyFailureTable;
  @ApiProperty({ type: Object, nullable: true, example: { kind: 'attack', value: 5 } }) effect: SpellAlchemyEffect | null;
  @ApiProperty({ nullable: true }) target: string | null;
  @ApiProperty({ type: [ScrModifierDto] }) scrModifiers: ScrModifier[];
  @ApiProperty({ description: 'Sum of the SCR modifiers' }) scrBonus: number;
}

/** The budget of an enchantment (workspace spec 064). Amounts in gold. */
export class EnchantmentPlanDto {
  @ApiProperty({ type: [EnchantmentPlanSpellDto] }) spells: EnchantmentPlanSpell[];
  @ApiProperty() batchSize: number;
  @ApiProperty({ enum: POWER_LEVELS }) powerLevel: PowerLevel;
  @ApiProperty({ example: 1 }) powerMultiplier: number;
  @ApiProperty({ description: 'Sum of the days of the spells' }) baseDays: number;
  @ApiProperty({ description: 'Days the material bonus takes off (down to half)' }) materialBonusReduction: number;
  @ApiProperty() workingDays: number;
  @ApiProperty() ppPerDay: number;
  @ApiProperty({ description: 'Highest spell level, added to the breakage checks' }) itemLevel: number;
  @ApiProperty({ description: 'Gold of the materials, before the power multiplier' }) materialCost: number;
  @ApiProperty({ description: 'Gold of the labour, before the power multiplier' }) laborCost: number;
  @ApiProperty({ description: '(materials + labour) × power multiplier' }) enchantmentCost: number;
  @ApiProperty({ description: 'Materials × power multiplier: paid when the work starts' }) paidAtStart: number;
  @ApiProperty({ description: 'Base items plus the enchantment cost' }) marketValue: number;
  @ApiProperty() maxAlchemists: number;
  @ApiProperty({ type: [String], example: ['pp-per-day-above-character-pp'] }) warnings: string[];

  static of(plan: EnchantmentPlan): EnchantmentPlanDto {
    return Object.assign(new EnchantmentPlanDto(), plan);
  }
}

export class EnchantmentFailureDto {
  @ApiProperty({ enum: ALCHEMY_FAILURE_TABLES }) table: AlchemyFailureTable;
  @ApiProperty() min: number;
  @ApiProperty({ nullable: true }) max: number | null;
  @ApiProperty() text: string;
  @ApiProperty({ enum: ['minor', 'major'], required: false }) serendipity?: 'minor' | 'major';
}

export class EnchantmentScrDto {
  @ApiProperty() spellId: string;
  @ApiProperty() roll: number;
  @ApiProperty() total: number;
  @ApiProperty() failed: boolean;
  @ApiProperty({ nullable: true }) failureRoll: number | null;
  @ApiProperty({ description: 'Added to the failure roll' }) failureModifier: number;
  @ApiProperty({ type: EnchantmentFailureDto, nullable: true }) failure: EnchantmentFailure | null;
}

export class EnchantmentProjectDto {
  @ApiProperty() id: string;
  @ApiProperty() gameId: string;
  @ApiProperty() alchemistId: string;
  @ApiProperty() alchemistName: string;
  @ApiProperty() itemId: string;
  @ApiProperty() itemName: string;
  @ApiProperty({ type: Object, description: 'The request it was started with' }) request: EnchantmentRequest;
  @ApiProperty({ type: EnchantmentPlanDto }) plan: EnchantmentPlan;
  @ApiProperty({ type: [EnchantmentScrDto] }) scr: EnchantmentScr[];
  @ApiProperty({ enum: ENCHANTMENT_STATUSES }) status: EnchantmentStatus;
  @ApiProperty() daysCompleted: number;
  @ApiProperty() extraDays: number;
  @ApiProperty({ description: 'Gold of the extra costs' }) extraCost: number;
  @ApiProperty({ nullable: true }) notes: string | null;
  @ApiProperty({ type: Object, nullable: true, example: { kind: 'character', id: 'character-001' } }) payer: ItemHolder | null;
  @ApiProperty({ description: 'Gold the payer gave' }) paid: number;
  @ApiProperty({ description: 'Gold given back on a cancel' }) refunded: number;
  @ApiProperty({ type: [String] }) ledgerEntryIds: string[];
  @ApiProperty() owner: string;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true }) updatedAt: string | null;
  @ApiProperty({ nullable: true }) completedAt: string | null;
  @ApiProperty() version: number;

  static fromEntity(project: EnchantmentProject): EnchantmentProjectDto {
    const props = project.getProps();
    const dto = new EnchantmentProjectDto();
    Object.assign(dto, {
      ...props,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt ? props.updatedAt.toISOString() : null,
      completedAt: props.completedAt ? props.completedAt.toISOString() : null,
      version: project.version,
    });
    return dto;
  }
}

export class EnchantmentProjectPageDto {
  @ApiProperty({ type: [EnchantmentProjectDto] })
  content: EnchantmentProjectDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class EnchantmentCompletionDto {
  @ApiProperty({ type: EnchantmentProjectDto }) project: EnchantmentProjectDto;
  @ApiProperty({ type: ItemDto }) item: ItemDto;

  static of(result: EnchantmentCompletion): EnchantmentCompletionDto {
    const dto = new EnchantmentCompletionDto();
    dto.project = EnchantmentProjectDto.fromEntity(result.project);
    dto.item = ItemDto.fromEntity(result.item);
    return dto;
  }
}

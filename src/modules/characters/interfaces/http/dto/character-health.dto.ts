import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import {
  BLEEDING_CONTROLS,
  BODY_LOCATIONS,
  BODY_SIDES,
  HEALING_TYPES,
  INJURY_FLAGS,
  INJURY_SEVERITIES,
  INJURY_SOURCE_KINDS,
  INJURY_STATUSES,
  INJURY_TYPES,
  TREATMENT_PROCEDURES,
  TREATMENT_RESULTS,
} from '../../../domain/value-objects/injury.vo.js';
import type {
  BleedingControl,
  BodyLocation,
  BodySide,
  HealingType,
  Injury,
  InjuryFlag,
  InjurySeverity,
  InjurySourceKind,
  InjuryStatus,
  InjuryType,
  TreatmentContext,
  TreatmentProcedure,
  TreatmentResult,
} from '../../../domain/value-objects/injury.vo.js';
import { CHARACTER_CONDITION_STATUSES } from '../../../domain/value-objects/character-condition.vo.js';
import type { CharacterCondition, CharacterConditionStatus } from '../../../domain/value-objects/character-condition.vo.js';
import type { HealingLogEntry, HealingLogKind } from '../../../domain/value-objects/healing-log-entry.vo.js';
import type { HealthSummary } from '../../../domain/value-objects/health-summary.vo.js';

export class InjurySourceDto {
  @ApiProperty({ type: String, enum: INJURY_SOURCE_KINDS, example: 'critical' })
  kind: InjurySourceKind;
  @ApiPropertyOptional()
  tacticalGameId?: string;
  @ApiPropertyOptional()
  tacticalGameName?: string;
  @ApiPropertyOptional()
  actionId?: string;
  @ApiPropertyOptional()
  round?: number;
  @ApiPropertyOptional()
  attackerId?: string;
  @ApiPropertyOptional()
  attackerName?: string;
  @ApiPropertyOptional({ example: 'S-C-91' })
  criticalKey?: string;
}

export class InjuryHealerDto {
  @ApiPropertyOptional()
  characterId?: string;
  @ApiPropertyOptional()
  actorId?: string;
  @ApiProperty()
  name: string;
  @ApiPropertyOptional()
  external?: boolean;
  @ApiProperty({ description: 'Medicine bonus' })
  bonus: number;
}

export class InjuryTreatmentDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ type: String, enum: TREATMENT_PROCEDURES })
  procedure: TreatmentProcedure;
  @ApiProperty({ type: InjuryHealerDto })
  healer: InjuryHealerDto;
  @ApiProperty()
  difficulty: number;
  @ApiProperty()
  roll: number;
  @ApiProperty()
  total: number;
  @ApiProperty({ type: String, enum: TREATMENT_RESULTS })
  result: TreatmentResult;
  @ApiProperty({ type: String, enum: HEALING_TYPES })
  healingType: HealingType;
  @ApiProperty({ description: 'Recovery roll modifier of the medical maneuver table' })
  recoveryModifier: number;
  @ApiProperty()
  at: string;
  @ApiProperty({ type: String, enum: ['tactical', 'strategic'] })
  context: TreatmentContext;
  @ApiPropertyOptional()
  tacticalGameId?: string;
}

export class InjuryRecoveryDto {
  @ApiProperty()
  roll: number;
  @ApiProperty()
  modifiers: number;
  @ApiProperty()
  total: number;
  @ApiProperty()
  baseDays: number;
  @ApiProperty()
  multiplier: number;
  @ApiProperty()
  totalDays: number;
  @ApiProperty()
  remainingDays: number;
  @ApiProperty()
  startedAt: string;
}

export class InjuryPermanentDto {
  @ApiProperty()
  penalty: number;
  @ApiPropertyOptional()
  roll?: number;
}

export class InjuryDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ type: String, enum: INJURY_TYPES })
  type: InjuryType;
  @ApiProperty({ type: String, enum: INJURY_SEVERITIES })
  severity: InjurySeverity;
  @ApiPropertyOptional({ type: String, enum: BODY_LOCATIONS })
  location?: BodyLocation;
  @ApiPropertyOptional({ type: String, enum: BODY_SIDES })
  side?: BodySide;
  @ApiProperty({ example: -20 })
  penalty: number;
  @ApiProperty({ example: -30 })
  initialPenalty: number;
  @ApiPropertyOptional()
  bleeding?: number;
  @ApiPropertyOptional({ type: String, enum: BLEEDING_CONTROLS })
  bleedingControl?: BleedingControl;
  @ApiPropertyOptional({ enum: INJURY_FLAGS, isArray: true })
  flags?: InjuryFlag[];
  @ApiPropertyOptional()
  description?: string;
  @ApiProperty({ type: InjurySourceDto })
  source: InjurySourceDto;
  @ApiProperty({ type: [InjuryTreatmentDto] })
  treatments: InjuryTreatmentDto[];
  @ApiPropertyOptional({ type: InjuryRecoveryDto })
  recovery?: InjuryRecoveryDto;
  @ApiPropertyOptional({ type: InjuryPermanentDto })
  permanent?: InjuryPermanentDto;
  @ApiProperty({ type: String, enum: INJURY_STATUSES })
  status: InjuryStatus;
  @ApiProperty()
  createdAt: string;
  @ApiPropertyOptional()
  updatedAt?: string;
  @ApiPropertyOptional()
  healedAt?: string;

  static fromEntity(entity: Injury): InjuryDto {
    return Object.assign(new InjuryDto(), entity, { treatments: [...(entity.treatments || [])] });
  }
}

export class CharacterConditionDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ type: String, enum: CHARACTER_CONDITION_STATUSES })
  status: CharacterConditionStatus;
  @ApiProperty({ type: InjurySourceDto })
  source: InjurySourceDto;
  @ApiPropertyOptional()
  description?: string;
  @ApiProperty()
  createdAt: string;
  @ApiPropertyOptional()
  resolvedAt?: string;

  static fromEntity(entity: CharacterCondition): CharacterConditionDto {
    return Object.assign(new CharacterConditionDto(), entity);
  }
}

export class HealthSummaryDto {
  @ApiProperty({ description: 'Sum of the active, recovering and permanent injury penalties', example: -25 })
  injuryPenalty: number;
  @ApiProperty({ description: 'Active or recovering injuries', example: 2 })
  activeInjuries: number;
  @ApiProperty({ description: 'Hits per round of the injuries that are not healed', example: 0 })
  bleeding: number;

  static fromEntity(entity: HealthSummary): HealthSummaryDto {
    return Object.assign(new HealthSummaryDto(), entity);
  }
}

export class HealingLogEntryDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  at: string;
  @ApiProperty({ type: String, enum: ['tactical-outcome', 'treatment', 'recovery-roll', 'permanent-roll', 'rest', 'manual'] })
  kind: HealingLogKind;
  @ApiPropertyOptional()
  injuryId?: string;
  @ApiPropertyOptional()
  tacticalGameId?: string;
  @ApiPropertyOptional()
  healerName?: string;
  @ApiProperty({ type: Object, description: 'Data to render with i18n' })
  summary: Record<string, unknown>;

  static fromEntity(entity: HealingLogEntry): HealingLogEntryDto {
    return Object.assign(new HealingLogEntryDto(), entity);
  }
}

export class HealingLogPageDto {
  @ApiProperty({ type: [HealingLogEntryDto] })
  content: HealingLogEntryDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

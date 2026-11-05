import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { InjuryPoison } from '../../../domain/value-objects/poison.vo.js';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import {
  BLEEDING_CONTROLS,
  BODY_LOCATIONS,
  BODY_SIDES,
  CAST_SUPPORTS,
  HEALING_TYPES,
  INJURY_REOPEN_ON,
  PACES,
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
  CastSupport,
  HealingType,
  Injury,
  InjuryFlag,
  InjuryReopenOn,
  InjurySeverity,
  InjurySourceKind,
  InjuryStatus,
  InjuryType,
  RollModifier,
  RuleParams,
  TreatmentContext,
  TreatmentDifficultySource,
  TreatmentHerb,
  TreatmentProcedure,
  TreatmentResult,
} from '../../../domain/value-objects/injury.vo.js';
import { CHARACTER_CONDITION_STATUSES } from '../../../domain/value-objects/character-condition.vo.js';
import type { CharacterCondition, CharacterConditionStatus } from '../../../domain/value-objects/character-condition.vo.js';
import type { HealingLogEntry, HealingLogKind } from '../../../domain/value-objects/healing-log-entry.vo.js';
import type { HealthSummary } from '../../../domain/value-objects/health-summary.vo.js';
import type { Pace } from '../../../domain/value-objects/character-movement.vo.js';
import {
  LOST_LIMB_CAUSES,
  LOST_LIMB_LOCATIONS,
  type LostLimb,
  type LostLimbCause,
  type LostLimbLocation,
} from '../../../domain/value-objects/lost-limb.vo.js';
import {
  TEMPORARY_MODIFIER_KINDS,
  TEMPORARY_MODIFIER_SOURCES,
  type CharacterTemporaryModifier,
  type TemporaryModifierKind,
  type TemporaryModifierSource,
} from '../../../domain/value-objects/temporary-modifier.vo.js';

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
  @ApiPropertyOptional({ description: 'Own penalties of a healer character, added to the roll' })
  penalty?: number;
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
  @ApiPropertyOptional({ enum: ['table', 'override'], description: 'Core table (or its default) or the game master' })
  difficultySource?: TreatmentDifficultySource;
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
  @ApiPropertyOptional({ description: 'Heat critical severity of a cauterization, for the game master', example: 'A' })
  heatCritical?: string;
  @ApiPropertyOptional({ description: 'Herb used and its Medicine and recovery bonuses (workspace spec 062)', type: Object })
  herb?: TreatmentHerb;
  @ApiPropertyOptional({ description: "Spec 068: e.g. 'completed-after-combat'" })
  note?: string;
  @ApiPropertyOptional({ type: String, enum: CAST_SUPPORTS, description: 'Spec 068: what holds up a cast leg' })
  castSupport?: CastSupport;
  @ApiPropertyOptional({ description: 'Spec 068: recovery modifier of a salve chosen by the game master' })
  salveModifier?: number;
  @ApiPropertyOptional({ description: 'Spec 068: d10 of hits of the heat of a cauterization (Table 13-1c)' })
  heatHitsDice?: number;
  @ApiPropertyOptional({ description: 'Spec 068: the unmodified roll of a cauterization was its unusual event' })
  unusualEvent?: boolean;
}

/** Workspace spec 068: limits of a splinted or cast limb. */
export class InjuryLimitsDto {
  @ApiPropertyOptional({ type: String, enum: PACES, nullable: true, description: 'Fastest pace' })
  pace?: Pace | null;
  @ApiPropertyOptional({ description: 'The limb cannot be used' })
  limbUnusable?: boolean;
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Factor of the maneuver penalty of the injury', example: 0.5 })
  maneuverPenaltyFactor?: number | null;
}

/** Workspace spec 068: rounds of a tactical game when a tourniquet was tightened and loosened. */
export class InjuryTourniquetDto {
  @ApiProperty()
  tightSince: number;
  @ApiProperty({ type: Number, nullable: true })
  loosenedAt: number | null;
}

/** Workspace spec 079, C2: a strenuous activity failed while the injury recovered. */
export class InjuryStrenuousFailureDto {
  @ApiProperty()
  at: string;
  @ApiProperty({ description: 'An absolute failure doubled the penalty' })
  absolute: boolean;
  @ApiPropertyOptional({ description: 'Latest treatment when it failed: the next recovery roll needs a newer one' })
  treatmentId?: string;
  @ApiPropertyOptional({ description: 'Penalty before an absolute failure doubled it' })
  previousPenalty?: number;
}

/** Workspace spec 079, C1: a limb the character lost for good. */
export class LostLimbDto {
  @ApiProperty({ type: String, enum: LOST_LIMB_LOCATIONS })
  location: LostLimbLocation;
  @ApiProperty({ type: String, enum: ['left', 'right'] })
  side: BodySide;
  @ApiProperty()
  at: string;
  @ApiPropertyOptional({ type: String, enum: LOST_LIMB_CAUSES })
  cause?: LostLimbCause;
  @ApiPropertyOptional({ description: 'Day of the campaign (spec 065)' })
  gameDay?: number;
  @ApiPropertyOptional()
  tacticalGameId?: string;
  @ApiPropertyOptional()
  injuryId?: string;

  static fromEntity(entity: LostLimb): LostLimbDto {
    return Object.assign(new LostLimbDto(), entity);
  }
}

/** Workspace spec 068: a lasting morale or fear modifier and the day of the campaign it expires. */
export class TemporaryModifierDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ type: String, enum: TEMPORARY_MODIFIER_KINDS })
  kind: TemporaryModifierKind;
  @ApiProperty({ example: 5 })
  value: number;
  @ApiProperty({ type: String, enum: TEMPORARY_MODIFIER_SOURCES })
  source: TemporaryModifierSource;
  @ApiProperty({ type: Number, nullable: true, description: 'Days it lasts; null until the game master removes it' })
  days: number | null;
  @ApiProperty()
  createdAt: string;
  @ApiProperty({ type: String, nullable: true })
  tacticalGameId: string | null;
  @ApiProperty({ type: Number, nullable: true, description: 'First day of the campaign it no longer applies; null until removed' })
  expiresGameDay: number | null;

  static fromEntity(entity: CharacterTemporaryModifier): TemporaryModifierDto {
    return Object.assign(new TemporaryModifierDto(), entity);
  }
}

export class InjuryRecoveryDto {
  @ApiProperty()
  roll: number;
  @ApiProperty()
  modifiers: number;
  @ApiPropertyOptional({ description: 'The modifiers entry by entry, with their rules (workspace spec 052)', type: [Object] })
  breakdown?: RollModifier[];
  @ApiPropertyOptional({ description: 'Where the days come from: table column and multipliers', type: Object })
  days?: RuleParams;
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
  @ApiPropertyOptional({ description: 'Treatment the roll used: one recovery roll per treatment' })
  treatmentId?: string;
  @ApiPropertyOptional({ description: 'Rolled without care: the injury becomes permanent when the recovery ends' })
  untreated?: boolean;
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
  @ApiPropertyOptional({ type: Object, description: 'A poisoning (workspace spec 042): stages, RR and antidotes' })
  poison?: InjuryPoison;
  @ApiProperty({ type: String, enum: INJURY_STATUSES })
  status: InjuryStatus;
  @ApiProperty()
  createdAt: string;
  @ApiPropertyOptional()
  updatedAt?: string;
  @ApiPropertyOptional()
  healedAt?: string;
  @ApiPropertyOptional({ description: 'Day of the campaign when it was received (spec 065)' })
  gameDay?: number;
  @ApiPropertyOptional({ type: InjuryLimitsDto, nullable: true, description: 'Limits of a splint or a cast (spec 068)' })
  limits?: InjuryLimitsDto | null;
  @ApiPropertyOptional({ type: String, enum: INJURY_REOPEN_ON, nullable: true, description: 'What reopens the wound (spec 068)' })
  reopenOn?: InjuryReopenOn | null;
  @ApiPropertyOptional({ type: InjuryTourniquetDto, nullable: true, description: 'Tourniquet on the wound (spec 068)' })
  tourniquet?: InjuryTourniquetDto | null;
  @ApiPropertyOptional({ type: InjuryStrenuousFailureDto, nullable: true, description: 'Failed strenuous activity (spec 079)' })
  strenuousFailure?: InjuryStrenuousFailureDto | null;

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
  @ApiPropertyOptional({ description: 'Day of the campaign when it began: the day of a death (spec 079)' })
  gameDay?: number;

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
  @ApiProperty({
    type: String,
    enum: ['tactical-outcome', 'treatment', 'recovery-roll', 'permanent-roll', 'rest', 'manual', 'herb', 'amputation', 'strenuous-failure'],
  })
  kind: HealingLogKind;
  @ApiPropertyOptional()
  injuryId?: string;
  @ApiPropertyOptional()
  tacticalGameId?: string;
  @ApiPropertyOptional()
  healerName?: string;
  @ApiPropertyOptional({ description: 'Day of the campaign when it happened (spec 065)' })
  gameDay?: number;
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

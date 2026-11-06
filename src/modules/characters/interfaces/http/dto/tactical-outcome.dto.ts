import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateBy,
  ValidateNested,
} from 'class-validator';
import { ApplyTacticalOutcomeCommand } from '../../../application/cqrs/commands/apply-tactical-outcome.command.js';
import type { CharacterCondition } from '../../../domain/value-objects/character-condition.vo.js';
import { CHARACTER_CONDITION_STATUSES } from '../../../domain/value-objects/character-condition.vo.js';
import type { Injury, InjuryLimits, InjurySource, InjuryTourniquet } from '../../../domain/value-objects/injury.vo.js';
import {
  BODY_SIDES,
  type BodySide,
  INJURY_REOPEN_ON,
  INJURY_SEVERITIES,
  INJURY_STATUSES,
  INJURY_TYPES,
  PACES,
} from '../../../domain/value-objects/injury.vo.js';
import {
  LOST_LIMB_CAUSES,
  LOST_LIMB_LOCATIONS,
  type LostLimbCause,
  type LostLimbLocation,
} from '../../../domain/value-objects/lost-limb.vo.js';
import {
  TEMPORARY_MODIFIER_KINDS,
  TEMPORARY_MODIFIER_SOURCES,
  type TemporaryModifier,
  type TemporaryModifierKind,
  type TemporaryModifierSource,
} from '../../../domain/value-objects/temporary-modifier.vo.js';
import type {
  TacticalCoatingSpent,
  TacticalItemOutcome,
  TacticalFate,
  TacticalHpBySource,
  TacticalHpLogEntry,
  TacticalHpLogKind,
} from '../../../domain/value-objects/tactical-game-outcome.vo.js';
import { TACTICAL_HP_LOG_KINDS } from '../../../domain/value-objects/tactical-game-outcome.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { CharacterConditionDto, InjuryDto } from './character-health.dto.js';
import { ItemModifierDto } from '../../../../items/interfaces/http/dto/item-modifier.dto.js';
import { type ItemModifier, ItemModifiers } from '../../../../items/domain/value-objects/item-modifier.vo.js';

/** `true`/`false` (before spec 044) or `{ appliedAt }`, the identity of the spent coating. */
const isCoatingSpent = (value: unknown): boolean =>
  typeof value === 'boolean' ||
  (!!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { appliedAt?: unknown }).appliedAt === 'string' &&
    (value as { appliedAt: string }).appliedAt.length > 0);

/** Modifiers an item of the character got in the game (spec 019). */
export class TacticalItemOutcomeDto {
  @ApiProperty({ description: 'Strategic item identifier', example: 'item-001' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiPropertyOptional({ example: 'Broadsword' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ type: [ItemModifierDto] })
  @IsArray()
  modifiers: ItemModifier[];

  @ApiPropertyOptional({
    description:
      'The poison on the weapon was spent (workspace spec 042): the appliedAt of the spent coating (spec 044), or true from an older tactical',
    oneOf: [{ type: 'boolean' }, { type: 'object', properties: { appliedAt: { type: 'string' } }, required: ['appliedAt'] }],
  })
  @IsOptional()
  @ValidateBy({
    name: 'isCoatingSpent',
    validator: {
      validate: (value: unknown) => isCoatingSpent(value),
      defaultMessage: () => 'coatingSpent must be a boolean or an object with an appliedAt string',
    },
  })
  coatingSpent?: boolean | { appliedAt: string };
}

/** Workspace spec 068: units of an item of the character spent in the game. */
export class TacticalItemConsumedDto {
  @ApiProperty({ description: 'Strategic item identifier', example: 'item-001' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Units spent', example: 1 })
  @IsInt()
  @Min(1)
  amount: number;
}

/** Workspace spec 068: a temporary morale or fear modifier created in the game. */
export class TacticalTemporaryModifierDto {
  @ApiProperty({ example: 'modifier-001' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ type: String, enum: TEMPORARY_MODIFIER_KINDS })
  @IsIn(TEMPORARY_MODIFIER_KINDS)
  kind: TemporaryModifierKind;

  @ApiProperty({ example: 5 })
  @IsInt()
  value: number;

  @ApiProperty({ type: String, enum: TEMPORARY_MODIFIER_SOURCES })
  @IsIn(TEMPORARY_MODIFIER_SOURCES)
  source: TemporaryModifierSource;

  @ApiProperty({ type: Number, nullable: true, description: 'Days of campaign it lasts; null until removed', example: 30 })
  @IsInt()
  @Min(0)
  @IsOptional()
  days: number | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsString()
  @IsOptional()
  tacticalGameId?: string | null;
}

export class TacticalOutcomeHpDto {
  @ApiProperty({ example: 40 })
  @IsNumber()
  start: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  end: number;

  @ApiProperty({ description: 'end - start', example: -28 })
  @IsNumber()
  delta: number;
}

/** Workspace spec 077, D10: the fatigue penalty of the actor (points, 0-50) at the start and end of the game. */
export class TacticalOutcomeFatigueDto {
  @ApiProperty({ example: 20 })
  @IsNumber()
  start: number;

  @ApiProperty({ example: 35 })
  @IsNumber()
  end: number;

  @ApiProperty({ description: 'end - start, added to endurance.fatiguePenalty (0-50)', example: 15 })
  @IsNumber()
  delta: number;
}

/** Workspace spec 079, C1: a limb the actor lost (by a confirmed limb-loss alert or an amputation). */
export class TacticalLostLimbDto {
  @ApiProperty({ type: String, enum: LOST_LIMB_LOCATIONS })
  @IsIn(LOST_LIMB_LOCATIONS)
  location: LostLimbLocation;

  @ApiProperty({ type: String, enum: BODY_SIDES })
  @IsIn(BODY_SIDES)
  side: BodySide;

  @ApiProperty({ example: '2026-11-05T10:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  at: string;

  @ApiPropertyOptional({ type: String, enum: LOST_LIMB_CAUSES })
  @IsIn(LOST_LIMB_CAUSES)
  @IsOptional()
  cause?: LostLimbCause;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  injuryId?: string;
}

/** One element of TacticalGameOutcome.characters (rmu-api-tactical) plus the tactical game. */
export class TacticalOutcomeDto {
  @ApiProperty({ description: 'Tactical game identifier (idempotency key)', example: 'tactical-game-001' })
  @IsString()
  @IsNotEmpty()
  tacticalGameId: string;

  @ApiPropertyOptional({ description: 'Tactical game name', example: 'Ambush at the ford' })
  @IsString()
  @IsOptional()
  tacticalGameName?: string;

  @ApiProperty({ example: 'actor-001' })
  @IsString()
  @IsNotEmpty()
  actorId: string;

  @ApiPropertyOptional({ description: 'Strategic character identifier (must match the path)', example: 'character-001' })
  @IsString()
  @IsOptional()
  characterId: string;

  @ApiPropertyOptional({ example: 'Garath' })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({ type: TacticalOutcomeHpDto })
  @ValidateNested()
  @Type(() => TacticalOutcomeHpDto)
  hp: TacticalOutcomeHpDto;

  @ApiPropertyOptional({ type: TacticalOutcomeFatigueDto, description: 'Fatigue of the game (spec 077); missing: the fatigue is kept' })
  @ValidateNested()
  @Type(() => TacticalOutcomeFatigueDto)
  @IsOptional()
  fatigue?: TacticalOutcomeFatigueDto;

  @ApiPropertyOptional({
    description: 'Every change of the hits in the game (spec 013, §1.1); not stored on the character',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  hpLog?: TacticalHpLogEntry[];

  @ApiPropertyOptional({ description: 'Totals of the hits log by kind and by attacker; kept in the healing log', type: Object })
  @IsObject()
  @IsOptional()
  hpBySource?: TacticalHpBySource;

  @ApiProperty({ description: 'Final state of every injury of the actor', type: [InjuryDto] })
  @IsArray()
  injuries: Injury[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsOptional()
  injuriesAdded: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsOptional()
  injuriesUpdated: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsOptional()
  injuriesHealed: string[];

  @ApiProperty({ type: [CharacterConditionDto] })
  @IsArray()
  @IsOptional()
  conditions: CharacterCondition[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  conditionsResolved?: string[];

  @ApiPropertyOptional({ type: String, enum: ['dead', 'permanent-unconscious'] })
  @IsIn(['dead', 'permanent-unconscious'])
  @IsOptional()
  fate?: TacticalFate;

  @ApiPropertyOptional({ description: 'Modifiers the items of the character got in the game (spec 019)', type: [TacticalItemOutcomeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TacticalItemOutcomeDto)
  @IsOptional()
  items?: TacticalItemOutcomeDto[];

  @ApiPropertyOptional({ description: 'Units of items spent in the game (spec 068)', type: [TacticalItemConsumedDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TacticalItemConsumedDto)
  @IsOptional()
  itemsConsumed?: TacticalItemConsumedDto[];

  @ApiPropertyOptional({ description: 'Temporary modifiers created in the game (spec 068)', type: [TacticalTemporaryModifierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TacticalTemporaryModifierDto)
  @IsOptional()
  temporaryModifiers?: TacticalTemporaryModifierDto[];

  @ApiPropertyOptional({ description: 'Every limb the actor has lost at the end of the game (spec 079)', type: [TacticalLostLimbDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TacticalLostLimbDto)
  @IsOptional()
  lostLimbs?: TacticalLostLimbDto[];

  static toCommand(characterId: string, dto: TacticalOutcomeDto, userId: string, roles: string[]): ApplyTacticalOutcomeCommand {
    return new ApplyTacticalOutcomeCommand(
      characterId,
      {
        tacticalGameId: dto.tacticalGameId,
        tacticalGameName: dto.tacticalGameName,
        actorId: dto.actorId,
        characterId: dto.characterId,
        name: dto.name,
        hp: { start: dto.hp.start, end: dto.hp.end, delta: dto.hp.delta },
        ...(dto.fatigue ? { fatigue: { start: dto.fatigue.start, end: dto.fatigue.end, delta: dto.fatigue.delta } } : {}),
        ...TacticalOutcomeDto.toHpLog(dto),
        injuries: (dto.injuries || []).map(injury => TacticalOutcomeDto.toInjury(injury)),
        injuriesAdded: (dto.injuriesAdded || []).map(String),
        injuriesUpdated: (dto.injuriesUpdated || []).map(String),
        injuriesHealed: (dto.injuriesHealed || []).map(String),
        conditions: (dto.conditions || []).map(condition => TacticalOutcomeDto.toCondition(condition)),
        conditionsResolved: (dto.conditionsResolved || []).map(String),
        fate: dto.fate,
        ...(dto.items ? { items: dto.items.map(item => TacticalOutcomeDto.toItemOutcome(item)) } : {}),
        ...(dto.itemsConsumed ? { itemsConsumed: dto.itemsConsumed.map(({ itemId, amount }) => ({ itemId, amount })) } : {}),
        ...(dto.temporaryModifiers
          ? { temporaryModifiers: dto.temporaryModifiers.map(modifier => TacticalOutcomeDto.toTemporaryModifier(modifier, dto)) }
          : {}),
        ...(dto.lostLimbs
          ? {
              lostLimbs: dto.lostLimbs.map(({ location, side, at, cause, injuryId }) => ({
                location,
                side,
                at,
                ...(cause ? { cause } : {}),
                ...(injuryId ? { injuryId } : {}),
              })),
            }
          : {}),
      },
      userId,
      roles,
    );
  }

  private static toTemporaryModifier(raw: TacticalTemporaryModifierDto, dto: TacticalOutcomeDto): TemporaryModifier {
    return {
      id: raw.id,
      kind: raw.kind,
      value: raw.value,
      source: raw.source,
      days: raw.days ?? null,
      createdAt: raw.createdAt || new Date().toISOString(),
      tacticalGameId: raw.tacticalGameId ?? dto.tacticalGameId,
    };
  }

  /** Workspace spec 068: limits, reopening and tourniquet travel when tactical sends them; unknown shapes are dropped. */
  private static toHealingState(raw: Injury): Pick<Injury, 'limits' | 'reopenOn' | 'tourniquet'> {
    const result: Pick<Injury, 'limits' | 'reopenOn' | 'tourniquet'> = {};
    if (raw.limits === null) result.limits = null;
    else if (raw.limits && typeof raw.limits === 'object') {
      const limits: InjuryLimits = {};
      if (raw.limits.pace === null || PACES.includes(raw.limits.pace as never)) limits.pace = raw.limits.pace ?? null;
      if (typeof raw.limits.limbUnusable === 'boolean') limits.limbUnusable = raw.limits.limbUnusable;
      const factor = raw.limits.maneuverPenaltyFactor;
      if (factor === null || (typeof factor === 'number' && Number.isFinite(factor))) limits.maneuverPenaltyFactor = factor;
      result.limits = limits;
    }
    if (raw.reopenOn === null || INJURY_REOPEN_ON.includes(raw.reopenOn as never)) result.reopenOn = raw.reopenOn ?? null;
    if (raw.tourniquet === null) result.tourniquet = null;
    else if (raw.tourniquet && typeof raw.tourniquet === 'object' && Number.isFinite(Number(raw.tourniquet.tightSince))) {
      const loosenedAt = raw.tourniquet.loosenedAt;
      const tourniquet: InjuryTourniquet = {
        tightSince: Number(raw.tourniquet.tightSince),
        loosenedAt: loosenedAt === null || loosenedAt === undefined || !Number.isFinite(Number(loosenedAt)) ? null : Number(loosenedAt),
      };
      result.tourniquet = tourniquet;
    }
    return result;
  }

  /** Temporary damage does not last after the game: it is dropped. The others must be valid modifiers. */
  private static toItemOutcome(dto: TacticalItemOutcomeDto): TacticalItemOutcome {
    const modifiers = (dto.modifiers || [])
      .filter(modifier => !!modifier && typeof modifier === 'object' && !modifier.temporary)
      .map(modifier => {
        const result: ItemModifier = {
          id: String(modifier.id),
          type: modifier.type,
          value: Number(modifier.value),
          appliesTo: modifier.appliesTo,
          ...(modifier.broken ? { broken: true } : {}),
          ...(modifier.source ? { source: { ...modifier.source } } : {}),
          ...(modifier.description ? { description: String(modifier.description) } : {}),
          createdAt: modifier.createdAt ? String(modifier.createdAt) : new Date().toISOString(),
        };
        ItemModifiers.validate(result);
        return result;
      });
    return {
      itemId: dto.itemId,
      ...(dto.name ? { name: dto.name } : {}),
      modifiers,
      ...TacticalOutcomeDto.toCoatingSpent(dto.coatingSpent),
    };
  }

  private static toCoatingSpent(value: TacticalItemOutcomeDto['coatingSpent']): { coatingSpent?: TacticalCoatingSpent } {
    if (!value) return {};
    if (value === true) return { coatingSpent: true };
    return { coatingSpent: { appliedAt: String(value.appliedAt) } };
  }

  // The hits log is informative: entries and totals of an unknown shape are dropped, not rejected
  private static toHpLog(dto: TacticalOutcomeDto): { hpLog?: TacticalHpLogEntry[]; hpBySource?: TacticalHpBySource } {
    const result: { hpLog?: TacticalHpLogEntry[]; hpBySource?: TacticalHpBySource } = {};
    if (Array.isArray(dto.hpLog)) {
      result.hpLog = dto.hpLog.map(entry => TacticalOutcomeDto.toHpLogEntry(entry)).filter((entry): entry is TacticalHpLogEntry => !!entry);
    }
    const bySource = TacticalOutcomeDto.toHpBySource(dto.hpBySource);
    if (bySource) {
      result.hpBySource = bySource;
    }
    return result;
  }

  private static toHpLogEntry(raw: TacticalHpLogEntry): TacticalHpLogEntry | undefined {
    if (!raw || typeof raw !== 'object' || !TACTICAL_HP_LOG_KINDS.includes(raw.kind)) return undefined;
    const amount = Number(raw.amount);
    const round = Number(raw.round);
    if (!Number.isFinite(amount) || !Number.isFinite(round)) return undefined;
    const entry: TacticalHpLogEntry = {
      id: typeof raw.id === 'string' ? raw.id : '',
      round,
      amount,
      kind: raw.kind,
      at: typeof raw.at === 'string' ? raw.at : '',
    };
    if (Number.isFinite(Number(raw.phase)) && raw.phase !== null && raw.phase !== undefined) entry.phase = Number(raw.phase);
    (['actionId', 'attackerId', 'attackerName', 'injuryId', 'criticalKey'] as const).forEach(key => {
      if (typeof raw[key] === 'string') entry[key] = raw[key];
    });
    return entry;
  }

  private static toHpBySource(raw: TacticalHpBySource | undefined): TacticalHpBySource | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const byKind: Partial<Record<TacticalHpLogKind, number>> = {};
    if (raw.byKind && typeof raw.byKind === 'object') {
      TACTICAL_HP_LOG_KINDS.forEach(kind => {
        const value = Number(raw.byKind[kind]);
        if (raw.byKind[kind] !== undefined && Number.isFinite(value)) byKind[kind] = value;
      });
    }
    const byAttacker = (Array.isArray(raw.byAttacker) ? raw.byAttacker : [])
      .filter(each => !!each && typeof each.attackerId === 'string' && Number.isFinite(Number(each.amount)))
      .map(each => ({
        attackerId: each.attackerId,
        ...(typeof each.attackerName === 'string' ? { attackerName: each.attackerName } : {}),
        amount: Number(each.amount),
      }));
    return { byKind, byAttacker };
  }

  // The injuries travel as plain objects: their shape is checked here and unknown fields are dropped
  private static toInjury(raw: Injury): Injury {
    if (!raw || typeof raw.id !== 'string' || !raw.id) throw new ValidationError('Outcome injury without id', 'err-outcome-invalid');
    if (!INJURY_TYPES.includes(raw.type)) throw new ValidationError(`Invalid injury type ${raw.type}`, 'err-outcome-invalid');
    if (!INJURY_SEVERITIES.includes(raw.severity)) {
      throw new ValidationError(`Invalid injury severity ${raw.severity}`, 'err-outcome-invalid');
    }
    const status = INJURY_STATUSES.includes(raw.status) ? raw.status : 'active';
    const penalty = -Math.abs(Number(raw.penalty) || 0) || 0;
    return {
      id: raw.id,
      type: raw.type,
      severity: raw.severity,
      location: raw.location,
      side: raw.side,
      penalty,
      initialPenalty: raw.initialPenalty !== undefined ? -Math.abs(Number(raw.initialPenalty) || 0) || 0 : penalty,
      bleeding: raw.bleeding,
      bleedingControl: raw.bleedingControl,
      flags: raw.flags,
      description: raw.description,
      source: TacticalOutcomeDto.toSource(raw.source),
      treatments: Array.isArray(raw.treatments) ? raw.treatments : [],
      recovery: raw.recovery,
      permanent: raw.permanent,
      // Workspace spec 042: the poisoning travels with its injury.
      ...(raw.poison && typeof raw.poison === 'object' ? { poison: structuredClone(raw.poison) } : {}),
      status,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt,
      healedAt: raw.healedAt,
      gameDay: raw.gameDay,
      ...TacticalOutcomeDto.toHealingState(raw),
    };
  }

  private static toCondition(raw: CharacterCondition): CharacterCondition {
    if (!raw || typeof raw.id !== 'string' || !raw.id) throw new ValidationError('Outcome condition without id', 'err-outcome-invalid');
    if (!CHARACTER_CONDITION_STATUSES.includes(raw.status)) {
      throw new ValidationError(`Invalid condition status ${raw.status}`, 'err-outcome-invalid');
    }
    return {
      id: raw.id,
      status: raw.status,
      source: TacticalOutcomeDto.toSource(raw.source),
      description: raw.description,
      createdAt: raw.createdAt || new Date().toISOString(),
      resolvedAt: raw.resolvedAt,
    };
  }

  private static toSource(raw: InjurySource | undefined): InjurySource {
    return raw && typeof raw === 'object' ? { ...raw, kind: raw.kind || 'manual' } : { kind: 'manual' };
  }
}

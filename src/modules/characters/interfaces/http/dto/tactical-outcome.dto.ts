import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApplyTacticalOutcomeCommand } from 'src/modules/characters/application/cqrs/commands/apply-tactical-outcome.command';
import type { CharacterCondition } from 'src/modules/characters/domain/value-objects/character-condition.vo';
import { CHARACTER_CONDITION_STATUSES } from 'src/modules/characters/domain/value-objects/character-condition.vo';
import type { Injury, InjurySource } from 'src/modules/characters/domain/value-objects/injury.vo';
import { INJURY_SEVERITIES, INJURY_STATUSES, INJURY_TYPES } from 'src/modules/characters/domain/value-objects/injury.vo';
import type {
  TacticalItemOutcome,
  TacticalFate,
  TacticalHpBySource,
  TacticalHpLogEntry,
  TacticalHpLogKind,
} from 'src/modules/characters/domain/value-objects/tactical-game-outcome.vo';
import { TACTICAL_HP_LOG_KINDS } from 'src/modules/characters/domain/value-objects/tactical-game-outcome.vo';
import { ValidationError } from 'src/modules/shared/domain/errors/errors';
import { CharacterConditionDto, InjuryDto } from './character-health.dto';
import { ItemModifierDto } from 'src/modules/items/interfaces/http/dtos/item-modifier.dto';
import { type ItemModifier, ItemModifiers } from 'src/modules/items/domain/value-objects/item-modifier.vo';

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

  @ApiPropertyOptional({ enum: ['dead', 'permanent-unconscious'] })
  @IsIn(['dead', 'permanent-unconscious'])
  @IsOptional()
  fate?: TacticalFate;

  @ApiPropertyOptional({ description: 'Modifiers the items of the character got in the game (spec 019)', type: [TacticalItemOutcomeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TacticalItemOutcomeDto)
  @IsOptional()
  items?: TacticalItemOutcomeDto[];

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
        ...TacticalOutcomeDto.toHpLog(dto),
        injuries: (dto.injuries || []).map(injury => TacticalOutcomeDto.toInjury(injury)),
        injuriesAdded: (dto.injuriesAdded || []).map(String),
        injuriesUpdated: (dto.injuriesUpdated || []).map(String),
        injuriesHealed: (dto.injuriesHealed || []).map(String),
        conditions: (dto.conditions || []).map(condition => TacticalOutcomeDto.toCondition(condition)),
        conditionsResolved: (dto.conditionsResolved || []).map(String),
        fate: dto.fate,
        ...(dto.items ? { items: dto.items.map(item => TacticalOutcomeDto.toItemOutcome(item)) } : {}),
      },
      userId,
      roles,
    );
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
    return { itemId: dto.itemId, ...(dto.name ? { name: dto.name } : {}), modifiers };
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
      status,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt,
      healedAt: raw.healedAt,
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

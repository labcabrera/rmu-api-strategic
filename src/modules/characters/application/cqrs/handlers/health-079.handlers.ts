import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Character } from '../../../domain/aggregates/character.js';
import { AMPUTATION_RULE, type AmputationConsequence, AmputationRules } from '../../../domain/services/healing/amputation-rules.js';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator.js';
import type { InjuryHealer, InjurySource, RollModifier, TreatmentResult } from '../../../domain/value-objects/injury.vo.js';
import type { LostLimb } from '../../../domain/value-objects/lost-limb.vo.js';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../../ports/healing-tables-client.port.js';
import { type ManeuverClientPort, MANEUVER_CLIENT } from '../../ports/maneuver-client.port.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { AmputateLimbCommand, StrenuousFailureCommand } from '../commands/health-079.commands.js';
import { MEDICAL_MANEUVER_TABLE, resolveTreatmentHealer } from './treat-injury.handler.js';

export interface AmputationResult {
  character: Character;
  lostLimb: LostLimb;
  result: TreatmentResult;
  roll: number;
  difficulty: number;
  total: number;
  healer: InjuryHealer;
  breakdown: RollModifier[];
  /** Ids of the injuries of the stump */
  injuryIds: string[];
  /** What the game master resolves by hand: a critical one result lower, or system shock */
  consequence: AmputationConsequence;
}

/**
 * Workspace spec 079, C1 (§13.1 Amputation): surgical (-50) or emergency (-30) Medicine maneuver with the medical table
 * of core. The limb is lost whatever the result; the stump heals as its own injuries. A failure asks for a D Slash
 * critical one result lower and an absolute failure is system shock: strategic has no critical tables nor rounds, so
 * both are notes for the game master (in the answer and the healing log).
 */
@CommandHandler(AmputateLimbCommand)
export class AmputateLimbHandler implements ICommandHandler<AmputateLimbCommand, AmputationResult> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
    @Inject(MANEUVER_CLIENT) private readonly maneuverClient: ManeuverClientPort,
  ) {}

  async execute(command: AmputateLimbCommand): Promise<AmputationResult> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    if (character.status === 'dead') throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
    if (command.injuryId) character.findInjury(command.injuryId);
    const { healer } = await resolveTreatmentHealer(this.store, character, command);
    const difficulty = command.difficulty ?? AmputationRules.difficulty(command.method);
    const total = command.roll + healer.bonus + (healer.penalty ?? 0) + difficulty;
    const maneuver = await this.maneuverClient.absolute(total, MEDICAL_MANEUVER_TABLE);
    const result = maneuver.result;
    const breakdown: RollModifier[] = [
      { key: 'roll', value: command.roll },
      { key: 'medicine', value: healer.bonus, group: 'skill', rule: 'Table 3-15', params: { healer: healer.name } },
      {
        key: 'amputation-difficulty',
        value: difficulty,
        group: 'situation',
        rule: AMPUTATION_RULE,
        params: { method: `amputation-${command.method}`, ...(command.difficulty !== undefined ? { chosen: true } : {}) },
      },
      ...(healer.penalty ? [{ key: 'healer-penalty', value: healer.penalty, group: 'penalty' as const }] : []),
    ];
    const tables = await this.healingTablesClient.getHealingTables();
    const now = new Date().toISOString();
    const cauterized = AmputationRules.cauterized(command.method, command.cauterized);
    const source: InjurySource = { kind: 'manual', ...(command.injuryId ? { injuryId: command.injuryId } : {}) };
    const injuries = AmputationRules.stumpInjuries({
      method: command.method,
      location: command.location,
      side: command.side,
      cauterized,
      severity: new HealingCalculator(tables).severity(-40, 0),
      source,
      now,
    });
    const consequence = AmputationRules.consequence(result);
    const lostLimb = character.amputate(
      { location: command.location, side: command.side, ...(command.injuryId ? { injuryId: command.injuryId } : {}) },
      injuries,
      { method: command.method, cauterized, result, roll: command.roll, total, difficulty, healerName: healer.name, ...consequence },
      now,
    );
    const saved = await this.store.save(character);
    return {
      character: saved,
      // With the day of the campaign the store stamped
      lostLimb: saved.lostLimbs.find(each => each.location === lostLimb.location && each.side === lostLimb.side) ?? lostLimb,
      result,
      roll: command.roll,
      difficulty,
      total,
      healer,
      breakdown,
      injuryIds: injuries.map(injury => injury.id),
      consequence,
    };
  }
}

/**
 * Workspace spec 079, C2 (§13.1): a strenuous activity failed while a treated injury recovered. The injury is active
 * again without its recovery and needs a new treatment; an absolute failure doubles its penalty.
 */
@CommandHandler(StrenuousFailureCommand)
export class StrenuousFailureHandler implements ICommandHandler<StrenuousFailureCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
  ) {}

  async execute(command: StrenuousFailureCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    const calculator = new HealingCalculator(await this.healingTablesClient.getHealingTables());
    const injury = character.findInjury(command.injuryId);
    character.strenuousFailure(command.injuryId, command.absolute, penalty => calculator.severity(penalty, injury.bleeding));
    return this.store.save(character);
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Character } from '../../../domain/aggregates/character.js';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator.js';
import { InjuryTreatmentRules } from '../../../domain/services/healing/injury-treatment-rules.js';
import type { InjuryHealer, InjuryTreatment, TreatmentHerb, TreatmentResult } from '../../../domain/value-objects/injury.vo.js';
import { type HealingTablesClientPort, HEALING_TABLES_CLIENT } from '../../ports/healing-tables-client.port.js';
import { type AbsoluteManeuverResponse, type ManeuverClientPort, MANEUVER_CLIENT } from '../../ports/maneuver-client.port.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { type HeldHerb, HerbInventory } from '../../services/herb-inventory.service.js';
import { HerbRules } from '../../../domain/services/healing/herb-rules.js';
import { TreatInjuryCommand } from '../commands/treat-injury.command.js';

export const MEDICAL_MANEUVER_TABLE = 'medical';
export const MEDICINE_SKILL = 'medicine';
export const HERBALISM_SKILL = 'herbalism';
/** Penalty worsening of an absolute failure when the maneuver result does not carry it */
const DEFAULT_ABSOLUTE_FAILURE_WORSENING = 10;

const SUCCESSES: TreatmentResult[] = ['success', 'absolute-success'];

/**
 * Own penalties of a healer character for its maneuvers (spec 022, D10): its injury penalties. Strategic keeps no
 * fatigue or other temporary penalties, so those are not counted.
 */
const healerPenalty = (healer: Character): number => healer.healthSummary.injuryPenalty || 0;

export interface ResolvedHealer {
  healer: InjuryHealer;
  herbalismBonus: number | undefined;
}

@CommandHandler(TreatInjuryCommand)
export class TreatInjuryHandler implements ICommandHandler<TreatInjuryCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(HEALING_TABLES_CLIENT) private readonly healingTablesClient: HealingTablesClientPort,
    @Inject(MANEUVER_CLIENT) private readonly maneuverClient: ManeuverClientPort,
    private readonly herbs: HerbInventory,
  ) {}

  /**
   * Medicine roll of a treatment (spec 022): the difficulty comes from the core table unless the game master overrides
   * it (a procedure without a row in the table is refused, unless overridden), the healer character subtracts its own injury penalties, and the injuries of a dead character can still be
   * treated (§13.2; the departure of the soul is out of scope).
   */
  async execute(command: TreatInjuryCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    const injury = character.findInjury(command.injuryId);
    const tables = await this.healingTablesClient.getHealingTables();
    InjuryTreatmentRules.validate(command.procedure, injury, tables);
    const salveModifier = command.procedure === 'salve' ? (command.salveModifier ?? undefined) : undefined;
    if (salveModifier !== undefined) InjuryTreatmentRules.validateSalveModifier(salveModifier, tables);
    const castSupport = command.procedure === 'cast' ? (command.castSupport ?? undefined) : undefined;
    const override = command.difficulty !== undefined && command.difficulty !== null;
    const computed = InjuryTreatmentRules.difficulty(command.procedure, injury, tables);
    // No row in the core table: the procedure does not apply, unless the game master sets the difficulty
    if (!override && !computed.applicable) {
      throw new ValidationError(
        `Procedure ${command.procedure} does not apply to a ${injury.severity} ${injury.type} injury`,
        'err-treatment-not-applicable',
      );
    }
    const difficulty = override ? command.difficulty : computed.difficulty;
    const { healer, herbalismBonus } = await this.resolveHealer(character, command);
    const herbalismSuccess = await this.rollHerbalism(character, command, herbalismBonus);
    // Workspace spec 062: a herb of the inventory adds to the Medicine and recovery rolls
    const held: HeldHerb | undefined = command.herbItemId
      ? await this.herbs.load(command.herbItemId, character, { sameGame: true })
      : undefined;
    const herbBonus = held ? HerbRules.treatment(held.herb, injury.type, command.procedure) : undefined;

    let total = command.roll ?? 0;
    let result: TreatmentResult = 'success';
    let maneuver: AbsoluteManeuverResponse | undefined;
    // Healing spells work without a Medicine maneuver
    if (command.procedure !== 'magic') {
      if (command.roll === undefined || command.roll === null) {
        throw new ValidationError('The treatment requires a Medicine roll', 'err-treatment-roll-required');
      }
      total =
        command.roll +
        healer.bonus +
        (healer.penalty ?? 0) +
        difficulty +
        (herbalismSuccess ? tables.herbalismBonus : 0) +
        (herbBonus?.medicineBonus ?? 0);
      maneuver = await this.maneuverClient.absolute(total, MEDICAL_MANEUVER_TABLE);
      result = maneuver.result;
    }
    // Workspace spec 068: a cauterization follows Table 13-1c of core, by the same total
    const cauterization =
      command.procedure === 'cauterize' ? InjuryTreatmentRules.cauterization(total, command.roll ?? 0, tables) : undefined;
    if (cauterization) result = cauterization.row.result;
    const recoveryModifier = this.effectValue(maneuver, 'recoveryRollModifier') ?? 0;
    const worsening =
      result === 'absolute-failure' ? (this.effectValue(maneuver, 'injuryPenalty') ?? DEFAULT_ABSOLUTE_FAILURE_WORSENING) : 0;
    const heatCritical = cauterization?.row.heatSeverity ?? undefined;
    const treatment: InjuryTreatment = {
      id: randomUUID(),
      procedure: command.procedure,
      healer,
      difficulty,
      difficultySource: override ? 'override' : 'table',
      roll: command.roll ?? 0,
      total,
      result,
      healingType: command.healingType ?? HealingCalculator.healingType(command.procedure, result, herbalismSuccess || !!herbBonus?.treats),
      recoveryModifier,
      at: new Date().toISOString(),
      context: 'strategic',
      ...(heatCritical ? { heatCritical } : {}),
      ...(cauterization?.row.hitsDice ? { heatHitsDice: cauterization.row.hitsDice } : {}),
      ...(cauterization?.unusualEvent ? { unusualEvent: true } : {}),
      ...(castSupport ? { castSupport } : {}),
      ...(salveModifier !== undefined ? { salveModifier } : {}),
      ...(held && herbBonus ? { herb: TreatInjuryHandler.herbOf(held, herbBonus) } : {}),
    };
    character.addInjuryTreatment(injury.id, treatment, tables, Math.abs(worsening));
    const saved = await this.store.save(character);
    if (held) await this.herbs.spendDose(held, `herb-treatment:${injury.id}`, command.userId);
    return saved;
  }

  private static herbOf(held: HeldHerb, bonus: { medicineBonus: number; recoveryBonus: number }): TreatmentHerb {
    return {
      itemId: held.item.id,
      itemTypeId: held.item.itemTypeId,
      name: held.item.name,
      magical: held.herb.magical !== false,
      medicineBonus: bonus.medicineBonus,
      recoveryBonus: bonus.recoveryBonus,
    };
  }

  private effectValue(maneuver: AbsoluteManeuverResponse | undefined, status: string): number | undefined {
    return maneuver?.effects?.find(effect => effect.status === status)?.value;
  }

  private async resolveHealer(patient: Character, command: TreatInjuryCommand): Promise<ResolvedHealer> {
    return resolveTreatmentHealer(this.store, patient, command);
  }

  /** Healer of the same strategic game (the patient can treat itself). */
  private async findHealer(patient: Character, healerCharacterId: string): Promise<Character> {
    return findGameHealer(this.store, patient, healerCharacterId);
  }

  /** Herbalism roll with the medical table: a success adds the herbalism bonus to the Medicine roll. */
  private async rollHerbalism(patient: Character, command: TreatInjuryCommand, healerHerbalismBonus: number | undefined): Promise<boolean> {
    const herbalism = command.herbalism;
    if (!herbalism) return false;
    let bonus = herbalism.bonus;
    if (bonus === undefined && herbalism.healerCharacterId) {
      const herbalist = await this.findHealer(patient, herbalism.healerCharacterId);
      bonus = herbalist.getSkillBonus(HERBALISM_SKILL, null) + healerPenalty(herbalist);
    }
    if (bonus === undefined) bonus = healerHerbalismBonus;
    if (bonus === undefined) {
      throw new ValidationError('The herbalism roll requires a bonus or a healer character', 'err-herbalism-bonus-required');
    }
    const result = await this.maneuverClient.absolute(herbalism.roll + bonus, MEDICAL_MANEUVER_TABLE);
    return SUCCESSES.includes(result.result);
  }
}

/**
 * The healer of a medical maneuver (spec 022): a character of the game of the patient (its Medicine and its own injury
 * penalties) or an external one. Shared by the treatments and the amputations (workspace spec 079).
 */
export async function resolveTreatmentHealer(
  store: CharacterHealthStore,
  patient: Character,
  request: { healerCharacterId?: string; healer?: { name: string; bonus: number; herbalismBonus?: number } },
): Promise<ResolvedHealer> {
  if (request.healerCharacterId) {
    const healer = await findGameHealer(store, patient, request.healerCharacterId);
    const penalty = healerPenalty(healer);
    return {
      healer: {
        characterId: healer.id,
        name: healer.name,
        bonus: healer.getSkillBonus(MEDICINE_SKILL, null),
        ...(penalty ? { penalty } : {}),
      },
      herbalismBonus: healer.getSkillBonus(HERBALISM_SKILL, null) + penalty,
    };
  }
  if (request.healer) {
    return {
      healer: { name: request.healer.name, external: true, bonus: request.healer.bonus || 0 },
      herbalismBonus: request.healer.herbalismBonus,
    };
  }
  throw new ValidationError('The treatment requires a healer character or an external healer', 'err-healer-required');
}

/** Healer of the same strategic game (the patient can treat itself). */
async function findGameHealer(store: CharacterHealthStore, patient: Character, healerCharacterId: string): Promise<Character> {
  if (healerCharacterId === patient.id) return patient;
  const healer = await store.findCharacter(healerCharacterId);
  if (!healer) throw new NotFoundError('Healer character', healerCharacterId, 'err-healer-not-found');
  if (healer.gameId !== patient.gameId) {
    throw new ValidationError(`Healer ${healerCharacterId} is not in the game of the patient`, 'err-healer-not-in-game');
  }
  return healer;
}

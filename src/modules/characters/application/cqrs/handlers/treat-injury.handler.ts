import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors';
import { Character } from '../../../domain/aggregates/character.aggregate';
import { HealingCalculator } from '../../../domain/services/healing/healing-calculator';
import { InjuryHealer, InjuryTreatment, TreatmentResult } from '../../../domain/value-objects/injury.vo';
import type { HealingTablesClientPort } from '../../ports/healing-tables-client.port';
import type { AbsoluteManeuverResponse, ManeuverClientPort } from '../../ports/maneuver-client.port';
import { CharacterHealthStore } from '../../services/character-health.store';
import { TreatInjuryCommand } from '../commands/treat-injury.command';

export const MEDICAL_MANEUVER_TABLE = 'medical';
export const MEDICINE_SKILL = 'medicine';
export const HERBALISM_SKILL = 'herbalism';
/** Penalty worsening of an absolute failure when the maneuver result does not carry it */
const DEFAULT_ABSOLUTE_FAILURE_WORSENING = 10;

const SUCCESSES: TreatmentResult[] = ['success', 'absolute-success'];

interface ResolvedHealer {
  healer: InjuryHealer;
  herbalismBonus: number | undefined;
}

@CommandHandler(TreatInjuryCommand)
export class TreatInjuryHandler implements ICommandHandler<TreatInjuryCommand, Character> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject('HealingTablesClient') private readonly healingTablesClient: HealingTablesClientPort,
    @Inject('ManeuverClient') private readonly maneuverClient: ManeuverClientPort,
  ) {}

  async execute(command: TreatInjuryCommand): Promise<Character> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    if (character.status === 'dead') throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
    const injury = character.findInjury(command.injuryId);
    if (injury.status === 'healed') throw new ValidationError(`Injury ${injury.id} is already healed`, 'err-injury-healed');
    const tables = await this.healingTablesClient.getHealingTables();
    const { healer, herbalismBonus } = await this.resolveHealer(character, command);
    const herbalismSuccess = await this.rollHerbalism(character, command, herbalismBonus);
    const difficulty = command.difficulty ?? 0;

    let total = command.roll ?? 0;
    let result: TreatmentResult = 'success';
    let maneuver: AbsoluteManeuverResponse | undefined;
    // Healing spells work without a Medicine maneuver
    if (command.procedure !== 'magic') {
      if (command.roll === undefined || command.roll === null) {
        throw new ValidationError('The treatment requires a Medicine roll', 'err-treatment-roll-required');
      }
      total = command.roll + healer.bonus + difficulty + (herbalismSuccess ? tables.herbalismBonus : 0);
      maneuver = await this.maneuverClient.absolute(total, MEDICAL_MANEUVER_TABLE);
      result = maneuver.result;
    }
    const recoveryModifier = this.effectValue(maneuver, 'recoveryRollModifier') ?? 0;
    const worsening =
      result === 'absolute-failure' ? (this.effectValue(maneuver, 'injuryPenalty') ?? DEFAULT_ABSOLUTE_FAILURE_WORSENING) : 0;
    const treatment: InjuryTreatment = {
      id: randomUUID(),
      procedure: command.procedure,
      healer,
      difficulty,
      roll: command.roll ?? 0,
      total,
      result,
      healingType: command.healingType ?? HealingCalculator.healingType(command.procedure, result, herbalismSuccess),
      recoveryModifier,
      at: new Date().toISOString(),
      context: 'strategic',
    };
    character.addInjuryTreatment(injury.id, treatment, worsening);
    return this.store.save(character);
  }

  private effectValue(maneuver: AbsoluteManeuverResponse | undefined, status: string): number | undefined {
    return maneuver?.effects?.find(effect => effect.status === status)?.value;
  }

  private async resolveHealer(patient: Character, command: TreatInjuryCommand): Promise<ResolvedHealer> {
    if (command.healerCharacterId) {
      const healer = await this.findHealer(patient, command.healerCharacterId);
      return {
        healer: { characterId: healer.id, name: healer.name, bonus: healer.getSkillBonus(MEDICINE_SKILL, null) },
        herbalismBonus: healer.getSkillBonus(HERBALISM_SKILL, null),
      };
    }
    if (command.healer) {
      return {
        healer: { name: command.healer.name, external: true, bonus: command.healer.bonus || 0 },
        herbalismBonus: command.healer.herbalismBonus,
      };
    }
    throw new ValidationError('The treatment requires a healer character or an external healer', 'err-healer-required');
  }

  /** Healer of the same strategic game (the patient can treat itself). */
  private async findHealer(patient: Character, healerCharacterId: string): Promise<Character> {
    if (healerCharacterId === patient.id) return patient;
    const healer = await this.store.findCharacter(healerCharacterId);
    if (!healer) throw new NotFoundError('Healer character', healerCharacterId, 'err-healer-not-found');
    if (healer.gameId !== patient.gameId) {
      throw new ValidationError(`Healer ${healerCharacterId} is not in the game of the patient`, 'err-healer-not-in-game');
    }
    return healer;
  }

  /** Herbalism roll with the medical table: a success adds the herbalism bonus to the Medicine roll. */
  private async rollHerbalism(patient: Character, command: TreatInjuryCommand, healerHerbalismBonus: number | undefined): Promise<boolean> {
    const herbalism = command.herbalism;
    if (!herbalism) return false;
    let bonus = herbalism.bonus;
    if (bonus === undefined && herbalism.healerCharacterId) {
      bonus = (await this.findHealer(patient, herbalism.healerCharacterId)).getSkillBonus(HERBALISM_SKILL, null);
    }
    if (bonus === undefined) bonus = healerHerbalismBonus;
    if (bonus === undefined) {
      throw new ValidationError('The herbalism roll requires a bonus or a healer character', 'err-herbalism-bonus-required');
    }
    const result = await this.maneuverClient.absolute(herbalism.roll + bonus, MEDICAL_MANEUVER_TABLE);
    return SUCCESSES.includes(result.result);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  type AbsoluteManeuverResponse,
  type ManeuverClientPort,
  MANEUVER_CLIENT,
} from '../../../characters/application/ports/maneuver-client.port.js';
import { DIFFICULTY_MODIFIERS, isDifficulty } from '../../../characters/domain/value-objects/difficulty.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { LedgerManeuver } from '../../domain/aggregates/item-ledger-entry.js';
import type { ItemManeuverRequest } from '../cqrs/commands/item-maneuver.js';
import type { HolderContext } from './holder-access.service.js';
import { skillBonus } from './skill-bonus.js';

/** An unmodified 66 is the unusual event of an absolute maneuver. */
export const UNUSUAL_EVENT_ROLL = 66;

/**
 * Crafting and repair as absolute maneuvers of core (workspace spec 023, decisions 10 and 11): roll, skill bonus of
 * the sheet (or typed), difficulty and modifiers, resolved on a table of core (`crafting`, `repair`).
 */
@Injectable()
export class ItemManeuverService {
  constructor(@Inject(MANEUVER_CLIENT) private readonly maneuvers: ManeuverClientPort) {}

  async resolve(
    table: string,
    request: ItemManeuverRequest,
    actor: HolderContext | null,
    extraModifiers: { key: string; value: number }[] = [],
  ): Promise<{ response: AbsoluteManeuverResponse; maneuver: LedgerManeuver }> {
    if (typeof request.roll !== 'number' || !Number.isFinite(request.roll)) {
      throw new ValidationError('A roll is required', 'err-item-roll-required');
    }
    const bonus =
      request.bonus ?? (request.skillId ? skillBonus(actor?.character ?? null, request.skillId, request.specialization) : undefined);
    if (bonus === undefined)
      throw new ValidationError('The skill bonus is unknown: choose a skill of the character or type it', 'err-item-skill-required');
    if (request.difficulty !== undefined && !isDifficulty(request.difficulty)) {
      throw new ValidationError(`Invalid difficulty ${request.difficulty as string}`, 'err-item-invalid-difficulty');
    }
    const modifiers = [
      ...(request.difficulty ? [{ key: 'difficulty', value: DIFFICULTY_MODIFIERS[request.difficulty] }] : []),
      ...extraModifiers,
      ...(request.modifiers ?? []),
    ].filter(modifier => modifier.value !== 0);
    const total = request.roll + bonus + modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
    const unusualEvent = request.unmodifiedRoll === UNUSUAL_EVENT_ROLL;
    const response = await this.maneuvers.absolute(total, table, unusualEvent);
    return {
      response,
      maneuver: {
        ...(request.skillId ? { skillId: request.skillId } : {}),
        roll: request.roll,
        ...(request.unmodifiedRoll !== undefined ? { unmodifiedRoll: request.unmodifiedRoll } : {}),
        bonus,
        modifiers,
        total,
        result: response.result,
        ...(unusualEvent ? { unusualEvent: true } : {}),
      },
    };
  }
}

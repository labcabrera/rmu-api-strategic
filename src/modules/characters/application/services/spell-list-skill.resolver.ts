import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { type SpellListClientPort, SPELL_LIST_CLIENT } from '../ports/spell-list-client.port.js';
import {
  checkSpellListRealm,
  isSpellListSkill,
  spellListSkill,
  type SpellListInfo,
} from '../../domain/services/spells/spell-list-rules.js';

export interface SpellListSkillContext {
  professionId: string;
  realms: string[];
  /** Workspace spec 064: `baseListLimit` of the profession (null or missing: no limit). */
  baseListLimit?: number | null;
  /** Workspace spec 064: Base lists the character already develops as `base-spell-list`. */
  baseLists?: number;
}

/**
 * Skill a spell list is developed with (spec 029): the specialization is the code of a list of rmu-api-spells, which
 * must exist and share a realm with the character, and the skill (Base, Open, Closed or Restricted) follows from the list
 * and the profession, whatever list skill the client sent. Workspace spec 064: a Base list beyond the limit of the
 * profession is Closed.
 */
@Injectable()
export class SpellListSkillResolver {
  constructor(@Inject(SPELL_LIST_CLIENT) private readonly spellListClient: SpellListClientPort) {}

  async resolve(skillId: string, specialization: string | null, context: SpellListSkillContext): Promise<string> {
    if (!isSpellListSkill(skillId) || !specialization) return skillId;
    const list = await this.findList(specialization);
    checkSpellListRealm(list, context.realms);
    return spellListSkill(list, context.professionId, { baseListLimit: context.baseListLimit, baseLists: context.baseLists ?? 0 });
  }

  async findList(code: string): Promise<SpellListInfo> {
    const list = await this.spellListClient.getSpellListByCode(code);
    if (!list) throw new ValidationError(`Spell list ${code} not found`, 'err-spell-list-not-found');
    return list;
  }
}

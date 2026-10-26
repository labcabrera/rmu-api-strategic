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
}

/**
 * Skill a spell list is developed with (spec 029): the specialization is the code of a list of rmu-api-spells, which
 * must exist and share a realm with the character, and the skill (Base, Open, Closed or Restricted) follows from the list
 * and the profession, whatever list skill the client sent.
 */
@Injectable()
export class SpellListSkillResolver {
  constructor(@Inject(SPELL_LIST_CLIENT) private readonly spellListClient: SpellListClientPort) {}

  async resolve(skillId: string, specialization: string | null, context: SpellListSkillContext): Promise<string> {
    if (!isSpellListSkill(skillId) || !specialization) return skillId;
    const list = await this.findList(specialization);
    checkSpellListRealm(list, context.realms);
    return spellListSkill(list, context.professionId);
  }

  async findList(code: string): Promise<SpellListInfo> {
    const list = await this.spellListClient.getSpellListByCode(code);
    if (!list) throw new ValidationError(`Spell list ${code} not found`, 'err-spell-list-not-found');
    return list;
  }
}

import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { CultureRanks } from '../../domain/aggregates/character.js';
import type { Culture, CultureSkillRank } from '../ports/culture-client.port.js';
import type { SkillResponse } from '../ports/skill-client.port.js';
import { toKey } from '../../../shared/domain/services/key.js';
import { specializationKey } from '../../domain/services/skills/specialization-keys.js';

export const LANGUAGE_SKILL_IDS = ['language-spoken', 'language-written'];
export const DEFAULT_CULTURE_MAX_RANKS_PER_SKILL = 2;

// Ranks the player assigns to one entry of the culture (index in culture.skillRanks)
export interface CultureAssignment {
  entry: number;
  skillId: string;
  specialization?: string | null;
  ranks: number;
}

const skillKey = (skillId: string, specialization: string | null) => `${skillId}#${specialization ?? ''}`;

const maxRanksPerSkill = (entry: CultureSkillRank): number => {
  if (entry.maxRanksPerSkill !== undefined && entry.maxRanksPerSkill !== null) {
    return entry.maxRanksPerSkill;
  }
  return entry.type === 'skill-choice' || entry.type === 'category-pool' ? DEFAULT_CULTURE_MAX_RANKS_PER_SKILL : Number.POSITIVE_INFINITY;
};

const findCatalogSkill = (skills: SkillResponse[], skillId: string | undefined, index: number): SkillResponse => {
  const skill = skillId ? skills.find(s => s.id === skillId) : undefined;
  if (!skill) {
    throw new ValidationError(`Culture entry ${index}: unknown skill '${skillId}'`, 'err-culture-wrong-skill');
  }
  return skill;
};

const isAllowedSkill = (entry: CultureSkillRank, skill: SkillResponse): boolean => {
  switch (entry.type) {
    case 'skill-choice': {
      const allowed = entry.skillIds?.length ? entry.skillIds : entry.skillId ? [entry.skillId] : [];
      return allowed.includes(skill.id);
    }
    case 'category-pool':
      return (entry.categoryIds || []).includes(skill.categoryId);
    case 'languages':
      return LANGUAGE_SKILL_IDS.includes(skill.id);
    case 'region':
      return entry.skillId === skill.id;
    default:
      return false;
  }
};

// Languages and regions always take the language or the region as specialization
const requiresSpecialization = (entry: CultureSkillRank, skill: SkillResponse): boolean =>
  entry.type === 'languages' || entry.type === 'region' || !!skill.specialization;

const resolveAssignment = (
  culture: Culture,
  entry: CultureSkillRank,
  assignment: CultureAssignment,
  skills: SkillResponse[],
): CultureRanks => {
  const index = assignment.entry;
  const skill = findCatalogSkill(skills, assignment.skillId, index);
  if (!isAllowedSkill(entry, skill)) {
    throw new ValidationError(`Culture entry ${index} (${entry.type}) does not accept the skill '${skill.id}'`, 'err-culture-wrong-skill');
  }
  const needsSpecialization = requiresSpecialization(entry, skill);
  // Languages and regions are catalog keys (spec 050), whatever the skill says
  const category = entry.type === 'languages' ? 'language' : entry.type === 'region' ? 'region' : skill.specialization;
  const specialization = needsSpecialization ? specializationKey(category, assignment.specialization) : null;
  if (needsSpecialization && !specialization) {
    throw new ValidationError(
      `Culture entry ${index}: skill '${skill.id}' requires a specialization`,
      'err-culture-missing-specialization',
    );
  }
  if (entry.type === 'languages' && culture.languages?.length && !culture.languages.map(toKey).includes(specialization!)) {
    throw new ValidationError(
      `Culture entry ${index}: language '${specialization}' is not offered by the culture`,
      'err-culture-language-not-offered',
    );
  }
  return { skillId: skill.id, specialization, ranks: assignment.ranks };
};

/**
 * Validates the player assignments against the culture entries and returns the ranks to apply, merged by skill and
 * specialization. 'skill' entries are applied automatically and cannot be assigned.
 */
export const resolveCultureRanks = (culture: Culture, assignments: CultureAssignment[], skills: SkillResponse[]): CultureRanks[] => {
  const entries = culture.skillRanks || [];
  const byEntry = new Map<number, CultureAssignment[]>();
  (assignments || []).forEach(assignment => {
    const entry = entries[assignment.entry];
    if (!Number.isInteger(assignment.entry) || !entry) {
      throw new ValidationError(`Culture ${culture.id} has no entry ${assignment.entry}`, 'err-culture-invalid-entry');
    }
    if (entry.type === 'skill') {
      throw new ValidationError(`Culture entry ${assignment.entry} has fixed ranks and cannot be assigned`, 'err-culture-invalid-entry');
    }
    if (!Number.isInteger(assignment.ranks) || assignment.ranks < 1) {
      throw new ValidationError(`Culture entry ${assignment.entry}: ranks must be a positive integer`, 'err-culture-invalid-entry');
    }
    byEntry.set(assignment.entry, [...(byEntry.get(assignment.entry) || []), assignment]);
  });

  const resolved: CultureRanks[] = [];
  entries.forEach((entry, index) => {
    if (entry.type === 'skill') {
      const skill = findCatalogSkill(skills, entry.skillId, index);
      resolved.push({
        skillId: skill.id,
        specialization: specializationKey(skill.specialization, entry.specialization),
        ranks: entry.ranks,
      });
      return;
    }
    const entryAssignments = byEntry.get(index) || [];
    const assigned = entryAssignments.reduce((sum, a) => sum + a.ranks, 0);
    if (assigned !== entry.ranks) {
      throw new ValidationError(
        `Culture entry ${index} (${entry.type}) needs ${entry.ranks} ranks, ${assigned} assigned`,
        'err-culture-incomplete-entry',
      );
    }
    const max = maxRanksPerSkill(entry);
    const perSkill = new Map<string, number>();
    entryAssignments.forEach(assignment => {
      const ranks = resolveAssignment(culture, entry, assignment, skills);
      const key = skillKey(ranks.skillId, ranks.specialization);
      const total = (perSkill.get(key) || 0) + ranks.ranks;
      if (total > max) {
        throw new ValidationError(
          `Culture entry ${index} allows up to ${max} ranks per skill, ${total} assigned to '${ranks.skillId}'`,
          'err-culture-max-ranks-per-skill',
        );
      }
      perSkill.set(key, total);
      resolved.push(ranks);
    });
  });

  const merged = new Map<string, CultureRanks>();
  resolved.forEach(r => {
    const key = skillKey(r.skillId, r.specialization);
    const current = merged.get(key);
    merged.set(key, current ? { ...current, ranks: current.ranks + r.ranks } : { ...r });
  });
  return Array.from(merged.values());
};

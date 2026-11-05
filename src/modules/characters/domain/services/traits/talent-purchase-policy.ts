import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Character } from '../../aggregates/character.js';
import type { CharacterTrait, TraitAcquisition, TraitAcquisitionType, TraitLink } from '../../value-objects/character-trait.vo.js';
import { isSpellListSkill } from '../spells/spell-list-rules.js';

/** What the purchase rules read of a catalog trait (the core trait catalog). */
export interface TraitCatalogEntry {
  id: string;
  isTalent: boolean;
  prerequisites?: { type: TraitAcquisitionType; value?: string }[];
  possibleFlaws?: string[];
}

/** The prerequisite the game master grants for the new tiers: training or milestone (or an automatic one to force it). */
export interface ChosenPrerequisite {
  type: TraitAcquisitionType;
  note?: string;
}

export const TRAIT_PREREQUISITE_UNMET = 'err-trait-prerequisite-unmet';
export const FLAW_NOT_HINDERING = 'err-flaw-not-hindering';
export const FLAW_NOT_LINKABLE = 'err-flaw-not-linkable';
export const FLAW_LINKED_EXCEEDS = 'err-flaw-linked-exceeds';
export const FLAW_LIMIT = 'err-flaw-limit';

/** Character Companion 7.0: one loose flaw, worth up to 20 development points. */
export const MAX_LOOSE_FLAWS = 1;
export const MAX_LOOSE_FLAW_POINTS = 20;

/** Prerequisites the game master grants: they are never met on their own. */
export const MASTER_PREREQUISITES: TraitAcquisitionType[] = ['training', 'milestone'];

/** Automatic prerequisites, in the order they are tried. */
const AUTOMATIC_PREREQUISITES: TraitAcquisitionType[] = ['race', 'profession', 'natural', 'skill'];

/** Flaws that only hinder a spellcaster: the character must have ranks in a spell list. */
const SPELLCASTER_FLAWS = ['mumbler', 'inglorious-failure', 'lack-of-scope', 'lack-of-time'];
/** Inept: the skill of its specialization must have ranks. */
const SKILL_FLAWS = ['inept'];

/** A tier of a talent per 10 ranks of the skill its `skill` prerequisite names. */
export const RANKS_PER_SKILL_TIER = 10;

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => !!entry);

/**
 * The optional purchase rules of talents and flaws (workspace spec 077, decision C11), checked only with the game
 * option `talentPurchaseRules`:
 * - every new tier of a talent meets one of the prerequisites of the catalog: `natural` at creation, `profession` and
 *   `race` by the ids they name, `skill` one tier per 10 ranks (all the tiers acquired by skill count); `training` and
 *   `milestone` are given by the game master. The prerequisite of each tier is kept in `acquiredBy`;
 * - a flaw must hinder: Inept needs ranks in its skill and the spellcasting flaws ranks in a spell list. The other flaws
 *   cannot be checked and wait for the game master (`pendingApproval`, question 10);
 * - a flaw taken with a talent is linked to it (`linkedTo`), must be one of its Possible Flaws and the linked flaws
 *   are worth at most the cost of the talent; otherwise it is a loose flaw: one only, up to -20.
 */
export class TalentPurchasePolicy {
  /** The prerequisite of every tier from `fromTier` (exclusive) to `toTier`, or err-trait-prerequisite-unmet. */
  static acquisitions(
    character: Character,
    trait: TraitCatalogEntry,
    current: CharacterTrait | undefined,
    toTier: number,
    specialization: string | undefined,
    chosen?: ChosenPrerequisite,
  ): TraitAcquisition[] {
    const prerequisites = trait.prerequisites ?? [];
    const fromTier = current ? (current.tier ?? 1) : 0;
    if (toTier <= fromTier || (prerequisites.length === 0 && !chosen)) return [];
    if (chosen && !prerequisites.some(prerequisite => prerequisite.type === chosen.type)) {
      throw new ValidationError(`Trait ${trait.id} cannot be acquired by ${chosen.type}`, TRAIT_PREREQUISITE_UNMET);
    }
    const skillTiers = { used: (current?.acquiredBy ?? []).filter(entry => entry.type === 'skill').length };
    const result: TraitAcquisition[] = [];
    for (let tier = fromTier + 1; tier <= toTier; tier++) {
      const candidates = chosen ? prerequisites.filter(p => p.type === chosen.type) : prerequisites;
      const types = chosen ? [chosen.type] : AUTOMATIC_PREREQUISITES;
      const acquisition = TalentPurchasePolicy.firstMet(character, types, candidates, specialization, skillTiers, chosen);
      if (!acquisition) {
        throw new ValidationError(`Tier ${tier} of trait ${trait.id} does not meet any of its prerequisites`, TRAIT_PREREQUISITE_UNMET);
      }
      result.push({ tier, ...acquisition });
    }
    return result;
  }

  /** Whether a new flaw waits for the game master; err-flaw-not-hindering when it clearly does not hinder. */
  static checkHindering(character: Character, trait: TraitCatalogEntry, specialization: string | undefined): { pendingApproval: boolean } {
    if (SKILL_FLAWS.includes(trait.id)) {
      if (TalentPurchasePolicy.skillRanks(character, specialization) <= 0) {
        throw new ValidationError(`Flaw ${trait.id} needs ranks in ${specialization ?? 'its skill'}`, FLAW_NOT_HINDERING);
      }
      return { pendingApproval: false };
    }
    if (SPELLCASTER_FLAWS.includes(trait.id)) {
      if (!character.skills.some(skill => isSpellListSkill(skill.skillId) && (skill.ranks || 0) > 0)) {
        throw new ValidationError(`Flaw ${trait.id} needs ranks in a spell list`, FLAW_NOT_HINDERING);
      }
      return { pendingApproval: false };
    }
    return { pendingApproval: true };
  }

  /**
   * A flaw linked to a talent of the character: one of its Possible Flaws, and the linked flaws together worth at most
   * the cost of the talent. `cost` is the cost of the flaw (negative); `flawId` and `specialization` leave its own
   * current tier out of the sum.
   */
  static checkLink(
    character: Character,
    flaw: TraitCatalogEntry,
    specialization: string | undefined,
    link: TraitLink,
    talent: TraitCatalogEntry | undefined,
    cost: number,
  ): void {
    const owned = character.findCharacterTrait(link.traitId, link.specialization);
    if (flaw.isTalent || !owned || !owned.isTalent || !talent || !(talent.possibleFlaws ?? []).includes(flaw.id)) {
      throw new ValidationError(`Flaw ${flaw.id} cannot be linked to ${link.traitId}`, FLAW_NOT_LINKABLE);
    }
    const others = character
      .linkedFlaws(owned)
      .filter(t => !(t.traitId === flaw.id && (t.specialization || undefined) === (specialization || undefined)));
    const total = others.reduce((sum, t) => sum + Math.abs(t.cost), 0) + Math.abs(cost);
    if (total > Math.abs(owned.cost)) {
      throw new ValidationError(
        `The flaws linked to ${link.traitId} would be worth ${total}, more than its cost ${owned.cost}`,
        FLAW_LINKED_EXCEEDS,
      );
    }
  }

  /** A loose flaw: the only one of the character, worth up to 20 points. */
  static checkLooseLimit(character: Character, flawId: string, specialization: string | undefined, cost: number): void {
    if (Math.abs(cost) > MAX_LOOSE_FLAW_POINTS) {
      throw new ValidationError(`A loose flaw is worth up to ${MAX_LOOSE_FLAW_POINTS} points, ${flawId} is ${cost}`, FLAW_LIMIT);
    }
    const others = character.traits.filter(
      t =>
        t.source !== 'race' &&
        !t.isTalent &&
        !t.linkedTo &&
        !(t.traitId === flawId && (t.specialization || undefined) === (specialization || undefined)),
    );
    if (others.length >= MAX_LOOSE_FLAWS) {
      throw new ValidationError(`The character already has a loose flaw (${others[0].traitId})`, FLAW_LIMIT);
    }
  }

  private static firstMet(
    character: Character,
    types: TraitAcquisitionType[],
    prerequisites: { type: TraitAcquisitionType; value?: string }[],
    specialization: string | undefined,
    skillTiers: { used: number },
    chosen?: ChosenPrerequisite,
  ): Omit<TraitAcquisition, 'tier'> | undefined {
    for (const type of types) {
      for (const prerequisite of prerequisites.filter(p => p.type === type)) {
        const value = prerequisite.value || undefined;
        switch (type) {
          case 'training':
          case 'milestone':
            // Only reached when the game master chose it
            return { type, ...(value ? { value } : {}), ...(chosen?.note ? { note: chosen.note } : {}) };
          case 'natural':
            if (character.isInCreation()) return { type };
            break;
          case 'profession':
            if (splitList(value).includes(character.info.professionId)) return { type, value: character.info.professionId };
            break;
          case 'race':
            if (splitList(value).includes(character.info.race.id)) return { type, value: character.info.race.id };
            break;
          case 'skill': {
            const skill = value ?? specialization;
            const allowed = Math.floor(TalentPurchasePolicy.skillRanks(character, skill) / RANKS_PER_SKILL_TIER);
            if (skill && skillTiers.used < allowed) {
              skillTiers.used++;
              return { type, value: skill };
            }
            break;
          }
        }
      }
    }
    return undefined;
  }

  /** Ranks in a skill given as `skillId` (its best specialization) or `skillId@specialization`. */
  private static skillRanks(character: Character, value: string | undefined): number {
    if (!value) return 0;
    const [skillId, specialization] = value.split('@');
    return character.skills
      .filter(skill => skill.skillId === skillId && (!specialization || skill.specialization === specialization))
      .reduce((max, skill) => Math.max(max, skill.ranks || 0), 0);
  }
}

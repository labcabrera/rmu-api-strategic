// Matches the specialization value stored in a character trait against a sheet element (spec 008 §1)

export type TraitSpecializationKind = 'stat' | 'realm' | 'skill' | 'skill-category' | 'melee-weapon-type' | 'ranged-weapon-type';

const SKILL_SEPARATOR = '@';

function splitSkillId(value: string): { skillId: string; specialization: string | null } {
  const index = value.indexOf(SKILL_SEPARATOR);
  if (index < 0) {
    return { skillId: value, specialization: null };
  }
  return { skillId: value.substring(0, index), specialization: value.substring(index + 1) };
}

// 'skillId' matches every specialization of the skill, 'skillId@specialization' only that one
export function matchesSkill(value: string | undefined, skillId: string, specialization: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const expected = splitSkillId(value);
  if (expected.skillId !== skillId) {
    return false;
  }
  return expected.specialization === null || expected.specialization === (specialization ?? null);
}

// Attack skill ids use the 'skillId@specialization' form, e.g. 'melee-weapon@blade'
export function matchesAttackSkill(value: string | undefined, attackSkillId: string | undefined): boolean {
  if (!attackSkillId) {
    return false;
  }
  const attack = splitSkillId(attackSkillId);
  return matchesSkill(value, attack.skillId, attack.specialization);
}

export function matchesWeaponType(
  kind: 'melee-weapon-type' | 'ranged-weapon-type',
  value: string | undefined,
  attackSkillId: string | undefined,
): boolean {
  if (!value || !attackSkillId) {
    return false;
  }
  const attack = splitSkillId(attackSkillId);
  const baseSkillId = kind === 'melee-weapon-type' ? 'melee-weapon' : 'ranged-weapon';
  return attack.skillId === baseSkillId && attack.specialization === value;
}

export function matchesKey(value: string | undefined, key: string): boolean {
  return !!value && value === key;
}

export function matchesAttack(kind: TraitSpecializationKind, value: string | undefined, attackSkillId: string | undefined): boolean {
  switch (kind) {
    case 'skill':
      return matchesAttackSkill(value, attackSkillId);
    case 'melee-weapon-type':
    case 'ranged-weapon-type':
      return matchesWeaponType(kind, value, attackSkillId);
    default:
      return false;
  }
}

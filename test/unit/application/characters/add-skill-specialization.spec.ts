import { describe, expect, it } from 'vitest';
import { validateSkillSpecialization } from '../../../../src/modules/characters/application/cqrs/handlers/add-skill.handler.js';
import type { SkillResponse } from '../../../../src/modules/characters/application/ports/skill-client.port.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';

const skill = (props: Partial<SkillResponse>): SkillResponse => ({
  id: 'some-skill',
  categoryId: 'crafting',
  bonus: [],
  specialization: undefined,
  ...props,
});

describe('validateSkillSpecialization', () => {
  it('requires a specialization when the skill has a specialization category', () => {
    expect(() => validateSkillSpecialization(skill({ specialization: 'skill-some' }), null)).toThrow(ValidationError);
    expect(() => validateSkillSpecialization(skill({ specialization: 'skill-some' }), 'Cooper')).not.toThrow();
  });

  it('accepts no specialization when it is optional (spec 037)', () => {
    const optional = skill({ specialization: 'skill-some', specializationOptional: true });
    expect(() => validateSkillSpecialization(optional, null)).not.toThrow();
    expect(() => validateSkillSpecialization(optional, 'Cooper')).not.toThrow();
  });

  it('rejects a specialization for a skill without one', () => {
    expect(() => validateSkillSpecialization(skill({}), 'Cooper')).toThrow(ValidationError);
  });
});

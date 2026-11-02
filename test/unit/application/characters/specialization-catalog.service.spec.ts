import { describe, expect, it, vi } from 'vitest';
import { SpecializationCatalogService } from '../../../../src/modules/characters/application/services/specialization-catalog.service.js';
import { specializationKey } from '../../../../src/modules/characters/domain/services/skills/specialization-keys.js';

describe('specializationKey (spec 050)', () => {
  it('normalizes catalog categories and keeps the rest', () => {
    expect(specializationKey('language', ' Orcish tongues ')).toBe('orcish-tongues');
    expect(specializationKey('language', 'Orcish-Tongues')).toBe('orcish-tongues');
    expect(specializationKey('region', 'Rhûn')).toBe('rhun');
    expect(specializationKey('spell-list', 'fire-law')).toBe('fire-law');
    expect(specializationKey('race', 'Orcs')).toBe('Orcs');
    expect(specializationKey('language', '  ')).toBeNull();
    expect(specializationKey(undefined, null)).toBeNull();
  });
});

describe('SpecializationCatalogService', () => {
  const setup = () => {
    const getKeys = vi.fn((category: string) => Promise.resolve(category === 'language' ? ['westron', 'black-speech'] : []));
    return { service: new SpecializationCatalogService({ getKeys }), getKeys };
  };

  it('accepts keys of the realm or global catalog and asks once per category', async () => {
    const { service, getKeys } = setup();
    await service.check(
      [
        { skillId: 'language-spoken', category: 'language', specialization: 'westron' },
        { skillId: 'language-written', category: 'language', specialization: 'black-speech' },
        { skillId: 'open-spell-list', category: 'spell-list', specialization: 'fire-law' },
        { skillId: 'perception', category: undefined, specialization: null },
      ],
      'realm-1',
    );
    expect(getKeys).toHaveBeenCalledExactlyOnceWith('language', 'realm-1');
  });

  it('rejects the keys the catalog does not have', async () => {
    const { service } = setup();
    await expect(
      service.check([{ skillId: 'language-spoken', category: 'language', specialization: 'orcish-tongues' }], null),
    ).rejects.toMatchObject({ code: 'err-unknown-specialization' });
    await expect(
      service.check([{ skillId: 'language-spoken', category: 'language', specialization: 'orcish-tongues' }], null),
    ).rejects.toThrow(/language-spoken@orcish-tongues/);
  });
});

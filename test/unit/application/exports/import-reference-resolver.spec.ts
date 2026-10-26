/* eslint-disable @typescript-eslint/no-unsafe-argument -- example files read as loose JSON */
import { readFileSync } from 'fs';
import { join } from 'path';
import { ImportReferenceResolver } from '../../../../src/modules/exports/application/services/import-reference.resolver.js';
import type { CharacterFile } from '../../../../src/modules/exports/domain/format/export-format.js';
import { BadGatewayError, NotFoundError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { UpstreamBadGatewayError } from '../../../../src/modules/shared/infrastructure/http/http-client.js';

const file = () =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../../fixtures/exports/v2/character.rmu.json'), 'utf8')) as CharacterFile;

describe('import reference resolver (spec 024, decision 8)', () => {
  const clients = (overrides: Record<string, unknown> = {}) => {
    const calls: string[] = [];
    const fake = {
      race: { getRaceById: (id: string) => (calls.push(`race:${id}`), Promise.resolve({ id, name: 'Race' })) },
      profession: { getProfessionById: (id: string) => Promise.resolve({ id, skillCosts: {}, professionalSkills: [] }) },
      culture: { getCultureById: (id: string) => Promise.resolve({ id, name: 'Culture', skillRanks: [] }) },
      skill: { getAllSkills: () => Promise.resolve({ content: [{ id: 'body-development' }] }) },
      trait: { getTraitById: (id: string) => Promise.reject(new NotFoundError('Trait', id)) },
      item: { getItemById: (id: string) => Promise.resolve(id === 'gold-coin' ? { id } : undefined) },
      ...overrides,
    } as Record<string, any>;
    const resolver = new ImportReferenceResolver(fake.race, fake.profession, fake.culture, fake.skill, fake.trait, fake.item);
    return { resolver, calls };
  };

  it('blocks a missing race or profession and warns about missing skills, traits and item types', async () => {
    const data = file().data;
    data.character.traits.push({
      traitId: 'lost',
      traitName: 'Lost',
      isTalent: true,
      tier: 1,
      cost: 0,
      specialization: null,
      paidWith: null,
    });
    const { resolver } = clients({
      race: { getRaceById: (id: string) => Promise.reject(new UpstreamBadGatewayError(`race ${id}`, 404)) },
      profession: { getProfessionById: () => Promise.resolve(undefined) },
    });
    const result = await resolver.resolve([{ entry: data, path: 'data' }], []);
    expect(result.errors.map(e => [e.kind, e.id])).toEqual([
      ['race', data.character.info.raceId],
      ['profession', data.character.info.professionId],
    ]);
    expect(result.missingTraits).toEqual(new Set(['lost']));
    expect([...result.missingSkills]).not.toContain('body-development');
    expect(result.warnings.map(w => w.code)).toEqual(
      expect.arrayContaining(['import-warning-missing-skill', 'import-warning-missing-trait', 'import-warning-missing-item-type']),
    );
  });

  it('asks each race once and does not report ids as missing when core is down', async () => {
    const data = file().data;
    const { resolver, calls } = clients();
    await resolver.resolve(
      [
        { entry: data, path: 'data' },
        { entry: data, path: 'data' },
      ],
      [],
    );
    expect(calls).toEqual([`race:${data.character.info.raceId}`]);
    const down = clients({ race: { getRaceById: () => Promise.reject(new BadGatewayError('core is not available')) } });
    await expect(down.resolver.resolve([{ entry: data, path: 'data' }], [])).rejects.toBeInstanceOf(BadGatewayError);
  });
});

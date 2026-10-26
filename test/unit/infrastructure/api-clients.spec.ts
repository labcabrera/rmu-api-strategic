import type { ConfigService } from '@nestjs/config';
import { BadGatewayError } from '../../../src/modules/shared/domain/errors/errors.js';
import {
  type HttpClient,
  UpstreamBadGatewayError,
  UpstreamValidationError,
} from '../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../src/modules/shared/infrastructure/security/token.service.js';
import { ApiItemClientAdapter } from '../../../src/modules/items/infrastructure/api-clients/api.item-client.adapter.js';
import { ApiProfessionClientAdapter } from '../../../src/modules/characters/infrastructure/api-clients/api.profession-client.adapter.js';
import { ApiSpellListClientAdapter } from '../../../src/modules/characters/infrastructure/api-clients/api.spell-list-client.adapter.js';

const tokens = { getToken: () => Promise.resolve('t0k') } as unknown as TokenService;
const config = { get: () => 'http://core/v1' } as unknown as ConfigService;
const clientFailing = (error: Error) => ({ get: vi.fn().mockRejectedValue(error) }) as unknown as HttpClient;

describe('ApiProfessionClientAdapter (F-strategic-12)', () => {
  it('answers undefined for a profession core does not have', async () => {
    const adapter = new ApiProfessionClientAdapter(tokens, config, clientFailing(new UpstreamBadGatewayError('core answered 404', 404)));
    await expect(adapter.getProfessionById('nobody')).resolves.toBeUndefined();
  });

  it.each([
    ['core down', new BadGatewayError('core is not available (ECONNREFUSED)')],
    ['a 500 of core', new UpstreamBadGatewayError('core answered 500', 500)],
    ['a 400 of core', new UpstreamValidationError('core answered 400', 400)],
  ])('lets %s through as the HttpClient mapped it', async (_, error) => {
    const adapter = new ApiProfessionClientAdapter(tokens, config, clientFailing(error));
    await expect(adapter.getProfessionById('fighter')).rejects.toBe(error);
  });

  it('encodes the id in the URL', async () => {
    const get = vi.fn().mockResolvedValue({ id: 'a/b' });
    const adapter = new ApiProfessionClientAdapter(tokens, config, { get } as unknown as HttpClient);
    await adapter.getProfessionById('a/b');
    expect(get).toHaveBeenCalledWith('http://core/v1/professions/a%2Fb', { token: 't0k' });
  });
});

describe('ApiItemClientAdapter (F-strategic-19)', () => {
  it('answers undefined for an item type the items API does not have, and encodes the id', async () => {
    const get = vi.fn().mockRejectedValue(new UpstreamBadGatewayError('items answered 404', 404));
    const adapter = new ApiItemClientAdapter(tokens, config, { get } as unknown as HttpClient);
    await expect(adapter.getItemById('a b')).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledWith('http://core/v1/items/a%20b', { token: 't0k' });
  });

  it('lets the other failures through', async () => {
    const error = new BadGatewayError('items is not available (ECONNREFUSED)');
    const adapter = new ApiItemClientAdapter(tokens, config, clientFailing(error));
    await expect(adapter.getItemById('rope')).rejects.toBe(error);
  });
});

describe('ApiSpellListClientAdapter (spec 029)', () => {
  it('finds a list by its code, or nothing', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ id: 'list-001', code: 'fire-law' }] })
      .mockResolvedValueOnce({ content: [] });
    const adapter = new ApiSpellListClientAdapter(tokens, config, { get } as unknown as HttpClient);
    await expect(adapter.getSpellListByCode('fire-law')).resolves.toMatchObject({ id: 'list-001' });
    await expect(adapter.getSpellListByCode('none')).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledWith('http://core/v1/spell-lists?q=code%3D%3Dfire-law&page=0&size=1', { token: 't0k' });
  });

  it('reads the spells of a list ordered by level', async () => {
    const get = vi.fn().mockResolvedValue({ content: [{ level: 3 }, { level: 1 }] });
    const adapter = new ApiSpellListClientAdapter(tokens, config, { get } as unknown as HttpClient);
    await expect(adapter.getSpellsByListId('list-001')).resolves.toEqual([{ level: 1 }, { level: 3 }]);
    expect(get).toHaveBeenCalledWith('http://core/v1/spells?q=spellListId%3D%3Dlist-001&page=0&size=100', { token: 't0k' });
  });

  it('lets the failures of rmu-api-spells through', async () => {
    const error = new BadGatewayError('spells is not available (ECONNREFUSED)');
    const adapter = new ApiSpellListClientAdapter(tokens, config, clientFailing(error));
    await expect(adapter.getSpellListByCode('fire-law')).rejects.toBe(error);
  });
});

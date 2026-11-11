import type { ConfigService } from '@nestjs/config';
import { ApiMediaClientAdapter } from '../../../../src/modules/chronicle/infrastructure/api-clients/api.media-client.adapter.js';
import { ChronicleChapterQueryDto } from '../../../../src/modules/chronicle/interfaces/http/dto/chronicle-chapter-query.dto.js';
import type { HttpClient } from '../../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../../src/modules/shared/infrastructure/security/token.service.js';

describe('ChronicleChapterQueryDto.gameIdOf (workspace spec 102)', () => {
  it.each([
    ['gameId==g1', 'g1'],
    ['gameId==g1;visibility==master', 'g1'],
    ['visibility==public;gameId==g2', 'g2'],
    ['title=re=x;(visibility==public;gameId==g3)', 'g3'],
  ])('reads the game of %s', (q, gameId) => {
    expect(ChronicleChapterQueryDto.gameIdOf(q)).toBe(gameId);
  });

  it.each([undefined, '', 'visibility==public', 'gameId!=g1', 'gameId==g1,gameId==g2', 'gameId=in=(g1,g2)'])(
    'rejects %s, which does not fix one game',
    q => {
      expect(() => ChronicleChapterQueryDto.gameIdOf(q)).toThrow(expect.objectContaining({ code: 'validation' }));
    },
  );

  it('rejects an invalid RSQL expression', () => {
    expect(() => ChronicleChapterQueryDto.gameIdOf('gameId==')).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('ApiMediaClientAdapter (workspace spec 102)', () => {
  const tokens = { getToken: () => Promise.resolve('t0k') } as unknown as TokenService;
  const config = { get: () => 'http://media/v1' } as unknown as ConfigService;

  it('deletes the images of a scope with the service token', async () => {
    const del = vi.fn().mockResolvedValue({ deleted: 3 });
    const adapter = new ApiMediaClientAdapter(tokens, config, { delete: del } as unknown as HttpClient);
    await expect(adapter.deleteImagesByScope('strategic-game:g1')).resolves.toBe(3);
    expect(del).toHaveBeenCalledWith('http://media/v1/images?scope=strategic-game%3Ag1', { token: 't0k' });
  });

  it('counts 0 when media answers without a body', async () => {
    const adapter = new ApiMediaClientAdapter(tokens, config, { delete: vi.fn().mockResolvedValue(undefined) } as unknown as HttpClient);
    await expect(adapter.deleteImagesByScope('strategic-game:g1')).resolves.toBe(0);
  });
});

import { DeleteChaptersByGameCommand } from '../../../../src/modules/chronicle/application/cqrs/commands/chronicle-chapter.commands.js';
import {
  CreateChronicleChapterCommand,
  DeleteChronicleChapterCommand,
  ReorderChronicleChaptersCommand,
  UpdateChronicleChapterCommand,
} from '../../../../src/modules/chronicle/application/cqrs/commands/chronicle-chapter.commands.js';
import { CreateChronicleChapterHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/create-chronicle-chapter.handler.js';
import { DeleteChaptersByGameHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/delete-chapters-by-game.handler.js';
import { DeleteChronicleChapterHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/delete-chronicle-chapter.handler.js';
import { GetChronicleChapterHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/get-chronicle-chapter.handler.js';
import { GetChronicleChaptersHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/get-chronicle-chapters.handler.js';
import { ReorderChronicleChaptersHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/reorder-chronicle-chapters.handler.js';
import { UpdateChronicleChapterHandler } from '../../../../src/modules/chronicle/application/cqrs/handlers/update-chronicle-chapter.handler.js';
import {
  GetChronicleChapterQuery,
  GetChronicleChaptersQuery,
} from '../../../../src/modules/chronicle/application/cqrs/queries/chronicle-chapter.queries.js';
import type { ChronicleChapterRepository } from '../../../../src/modules/chronicle/application/ports/chronicle-chapter-repository.port.js';
import type { MediaClientPort } from '../../../../src/modules/chronicle/application/ports/media-client.port.js';
import { ChronicleAccess } from '../../../../src/modules/chronicle/application/services/chronicle-access.service.js';
import { ChronicleChapter } from '../../../../src/modules/chronicle/domain/aggregates/chronicle-chapter.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import { GameAccess } from '../../../../src/modules/games/application/services/game-access.service.js';
import type { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import { BadGatewayError } from '../../../../src/modules/shared/domain/errors/errors.js';

const USER = ['rmu-user'];
const ADMIN = ['rmu-admin'];
const ROLES: Record<string, string> = { master: 'master', player: 'player', spectator: 'spectator' };

// A game of `owner` whose members are named after their role; anybody else is an outsider.
const game = { id: 'g1', owner: 'owner', accessType: 'public', roleOf: (userId: string) => ROLES[userId] } as unknown as Game;

const chapter = (overrides: Partial<Parameters<typeof ChronicleChapter.create>[0]> = {}) =>
  ChronicleChapter.create({ gameId: 'g1', title: 'Lore', order: 0, owner: 'owner', ...overrides }).restoreVersion(0);

function setup(chapters: ChronicleChapter[] = []) {
  const stored = new Map(chapters.map(c => [c.id, c]));
  const repository = {
    findById: vi.fn((id: string) => Promise.resolve(stored.get(id) ?? null)),
    save: vi.fn((c: ChronicleChapter) => Promise.resolve(c)),
    update: vi.fn((c: ChronicleChapter) => Promise.resolve(c)),
    deleteById: vi.fn((id: string) => Promise.resolve(stored.get(id) ?? null)),
    countByGameId: vi.fn(() => Promise.resolve(stored.size)),
    maxOrder: vi.fn(() => Promise.resolve(Math.max(-1, ...[...stored.values()].map(c => c.order)))),
    findIdsByGameId: vi.fn(() => Promise.resolve([...stored.keys()])),
    updateOrder: vi.fn(() => Promise.resolve()),
    findSummaries: vi.fn(() => Promise.resolve({ content: [] })),
    deleteByGameId: vi.fn(() => Promise.resolve(stored.size)),
  };
  const games = { findById: (id: string) => Promise.resolve(id === 'g1' ? game : null) } as unknown as GameRepository;
  const access = new ChronicleAccess(new GameAccess(games));
  const repo = repository as unknown as ChronicleChapterRepository;
  return { repository, repo, access };
}

describe('chronicle handlers (workspace spec 102)', () => {
  describe('CreateChronicleChapterHandler', () => {
    const create = (userId: string, roles = USER, gameId = 'g1') =>
      new CreateChronicleChapterCommand(gameId, 'New', 'Text', undefined, 5, userId, roles);

    it('appends the chapter after the last one, for the owner, a master or an admin', async () => {
      const { repo, access, repository } = setup([chapter({ order: 4 })]);
      const handler = new CreateChronicleChapterHandler(repo, access);
      for (const [userId, roles] of [
        ['owner', USER],
        ['master', USER],
        ['someone', ADMIN],
      ] as const) {
        const created = await handler.execute(create(userId, roles));
        expect(created.getProps()).toMatchObject({ order: 5, owner: userId, campaignDate: 5, content: 'Text', visibility: 'public' });
      }
      expect(repository.save).toHaveBeenCalledTimes(3);
    });

    it.each(['player', 'spectator', 'outsider'])('forbids a %s', async userId => {
      const { repo, access } = setup();
      await expect(new CreateChronicleChapterHandler(repo, access).execute(create(userId))).rejects.toMatchObject({ statusCode: 403 });
    });

    it('needs an existing game and room for one more chapter', async () => {
      const { repo, access, repository } = setup();
      const handler = new CreateChronicleChapterHandler(repo, access);
      await expect(handler.execute(create('owner', USER, 'missing'))).rejects.toMatchObject({ statusCode: 404 });
      repository.countByGameId.mockResolvedValueOnce(200);
      await expect(handler.execute(create('owner'))).rejects.toMatchObject({ code: 'chronicle-chapter-limit' });
      await expect(handler.execute(create('owner', []))).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('UpdateChronicleChapterHandler', () => {
    const update = (id: string, userId: string, version?: number) =>
      new UpdateChronicleChapterCommand(id, 'Changed', undefined, undefined, undefined, userId, USER, version);

    it('lets a master change a chapter, checking the version', async () => {
      const lore = chapter();
      const { repo, access, repository } = setup([lore]);
      const handler = new UpdateChronicleChapterHandler(repo, access);
      await expect(handler.execute(update(lore.id, 'master', 3))).rejects.toMatchObject({ code: 'version-conflict' });
      const changed = await handler.execute(update(lore.id, 'master', 0));
      expect(changed.getProps()).toMatchObject({ title: 'Changed', updatedBy: 'master' });
      expect(repository.update).toHaveBeenCalledTimes(1);
    });

    it('does not write a change that changes nothing', async () => {
      const lore = chapter({ title: 'Changed' });
      const { repo, access, repository } = setup([lore]);
      await new UpdateChronicleChapterHandler(repo, access).execute(update(lore.id, 'owner'));
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('hides a private chapter below master, and forbids changing a public one', async () => {
      const notes = chapter({ visibility: 'master' });
      const lore = chapter();
      const { repo, access } = setup([notes, lore]);
      const handler = new UpdateChronicleChapterHandler(repo, access);
      await expect(handler.execute(update(notes.id, 'player'))).rejects.toMatchObject({ code: 'chapter-not-found' });
      await expect(handler.execute(update(lore.id, 'player'))).rejects.toMatchObject({ statusCode: 403 });
      await expect(handler.execute(update('missing', 'owner'))).rejects.toMatchObject({ code: 'chapter-not-found' });
    });
  });

  describe('DeleteChronicleChapterHandler', () => {
    it('lets a master delete, and hides a private chapter from the others', async () => {
      const notes = chapter({ visibility: 'master' });
      const { repo, access, repository } = setup([notes]);
      const handler = new DeleteChronicleChapterHandler(repo, access);
      await expect(handler.execute(new DeleteChronicleChapterCommand(notes.id, 'spectator', USER))).rejects.toMatchObject({
        code: 'chapter-not-found',
      });
      await expect(handler.execute(new DeleteChronicleChapterCommand('missing', 'owner', USER))).rejects.toMatchObject({
        code: 'chapter-not-found',
      });
      await handler.execute(new DeleteChronicleChapterCommand(notes.id, 'master', USER));
      expect(repository.deleteById).toHaveBeenCalledWith(notes.id);
    });
  });

  describe('ReorderChronicleChaptersHandler', () => {
    it('writes the whole order for a master, and rejects an incomplete one', async () => {
      const a = chapter();
      const b = chapter({ order: 1 });
      const { repo, access, repository } = setup([a, b]);
      const handler = new ReorderChronicleChaptersHandler(repo, access);
      await expect(handler.execute(new ReorderChronicleChaptersCommand('g1', [a.id], 'owner', USER))).rejects.toMatchObject({
        code: 'chronicle-order-invalid',
      });
      await expect(handler.execute(new ReorderChronicleChaptersCommand('g1', [b.id, a.id], 'player', USER))).rejects.toMatchObject({
        statusCode: 403,
      });
      await handler.execute(new ReorderChronicleChaptersCommand('g1', [b.id, a.id], 'master', USER));
      expect(repository.updateOrder).toHaveBeenCalledWith('g1', [b.id, a.id]);
    });
  });

  describe('GetChronicleChaptersHandler', () => {
    const query = (userId: string, roles = USER) => new GetChronicleChaptersQuery('g1', 'gameId==g1', 0, 1000, userId, roles);

    it('lists every chapter for the masters, and only the public ones for players and spectators', async () => {
      const { repo, access, repository } = setup();
      const handler = new GetChronicleChaptersHandler(repo, access);
      await handler.execute(query('master'));
      expect(repository.findSummaries).toHaveBeenLastCalledWith('gameId==g1', 0, 1000, { type: 'eq', field: 'gameId', value: 'g1' });
      for (const userId of ['player', 'spectator']) {
        await handler.execute(query(userId));
        expect(repository.findSummaries).toHaveBeenLastCalledWith('gameId==g1', 0, 1000, {
          type: 'allOf',
          criteria: [
            { type: 'eq', field: 'gameId', value: 'g1' },
            { type: 'eq', field: 'visibility', value: 'public' },
          ],
        });
      }
    });

    it('forbids whoever only sees the card of the game', async () => {
      const { repo, access } = setup();
      await expect(new GetChronicleChaptersHandler(repo, access).execute(query('outsider'))).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('GetChronicleChapterHandler', () => {
    it('reads a public chapter for a spectator, and hides a private one', async () => {
      const lore = chapter();
      const notes = chapter({ visibility: 'master' });
      const { repo, access } = setup([lore, notes]);
      const handler = new GetChronicleChapterHandler(repo, access);
      await expect(handler.execute(new GetChronicleChapterQuery(lore.id, 'spectator', USER))).resolves.toBe(lore);
      await expect(handler.execute(new GetChronicleChapterQuery(notes.id, 'spectator', USER))).rejects.toMatchObject({
        code: 'chapter-not-found',
      });
      await expect(handler.execute(new GetChronicleChapterQuery(lore.id, 'outsider', USER))).rejects.toMatchObject({ statusCode: 403 });
      await expect(handler.execute(new GetChronicleChapterQuery(notes.id, 'master', USER))).resolves.toBe(notes);
    });
  });

  describe('DeleteChaptersByGameHandler', () => {
    it('deletes the chapters, then the images of the scope of the game', async () => {
      const { repo, repository } = setup([chapter()]);
      const media = { deleteImagesByScope: vi.fn(() => Promise.resolve(2)) } satisfies MediaClientPort;
      await new DeleteChaptersByGameHandler(repo, media).execute(new DeleteChaptersByGameCommand('g1'));
      expect(repository.deleteByGameId).toHaveBeenCalledWith('g1');
      expect(media.deleteImagesByScope).toHaveBeenCalledWith('strategic-game:g1');
    });

    it('logs a failure of media without rethrowing it', async () => {
      const { repo, repository } = setup([chapter()]);
      const media = { deleteImagesByScope: vi.fn(() => Promise.reject(new BadGatewayError('media is not available'))) };
      await expect(new DeleteChaptersByGameHandler(repo, media).execute(new DeleteChaptersByGameCommand('g1'))).resolves.toBeUndefined();
      expect(repository.deleteByGameId).toHaveBeenCalledWith('g1');
    });
  });
});

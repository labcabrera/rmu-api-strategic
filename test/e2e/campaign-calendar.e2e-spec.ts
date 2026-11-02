import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createGame, createFaction } from './support/builders.js';

interface CalendarBody {
  startDate: string;
  elapsedDays: number;
  elapsedHours: number;
  currentDay: number;
}

interface GameBody {
  id: string;
  version: number;
  calendar: CalendarBody;
}

interface PassTimeBody {
  game: GameBody;
  fromDay: number;
  toDay: number;
  dryRun: boolean;
  logEntryId?: string;
  characters: { characterId: string; activity: string; result?: { hpBefore: number; hpAfter: number } }[];
}

interface TimeLogBody {
  content: { type: string; fromDay: number; toDay: number; note?: string; characters: unknown[] }[];
  pagination: { totalElements: number };
}

/** Calendar and step of time of a campaign (workspace spec 065). */
describe('campaign calendar (e2e)', () => {
  let e2e: E2eApp;
  let game: GameBody;
  let characterId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    game = (await createGame(e2e, 'owner', { calendar: { startDate: '3 Víressë, 1640 T.A.' } })) as unknown as GameBody;
    const faction = await createFaction(e2e, game.id);
    characterId = (await createCharacter(e2e, game.id, faction.id)).id;
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
  });
  const base = () => `/v1/strategic-games/${game.id}`;
  const current = async () => (await as('owner').get(base())).body as GameBody;
  it('creates the game at day 1 with its start date', () => {
    expect(game.calendar).toEqual({ startDate: '3 Víressë, 1640 T.A.', elapsedDays: 0, elapsedHours: 0, currentDay: 1 });
  });

  it('carries the hours into days and logs each step', async () => {
    const first = await as('owner').post(`${base()}/pass-time`, { days: 0, hours: 10, note: 'Night camp', version: game.version });
    expect(first.status).toBe(200);
    const firstBody = first.body as PassTimeBody;
    expect(firstBody).toMatchObject({ fromDay: 1, toDay: 1, dryRun: false });
    expect(firstBody.game.calendar).toMatchObject({ elapsedDays: 0, elapsedHours: 10, currentDay: 1 });
    expect(firstBody.characters).toEqual([expect.objectContaining({ characterId, activity: 'rest' })]);

    const second = await as('owner').post(`${base()}/pass-time`, { days: 0, hours: 14, version: firstBody.game.version });
    expect(second.status).toBe(200);
    expect((second.body as PassTimeBody).game.calendar).toMatchObject({ elapsedDays: 1, elapsedHours: 0, currentDay: 2 });

    const log = await as('owner').get(`${base()}/time-log?size=1`);
    expect(log.status).toBe(200);
    const logBody = log.body as TimeLogBody;
    expect(logBody.pagination.totalElements).toBe(2);
    expect(logBody.content[0]).toMatchObject({ type: 'pass-time', fromDay: 1, toDay: 2 });
  });

  it('rests the characters like the rest of one character, and a dry run matches it', async () => {
    const before = await current();
    const preview = await as('owner').post(`${base()}/pass-time`, { days: 0, hours: 8, dryRun: true, version: before.version });
    expect(preview.status).toBe(200);
    expect((await current()).calendar.elapsedHours).toBe(0);
    const real = await as('owner').post(`${base()}/pass-time`, { days: 0, hours: 8, version: before.version });
    const previewResult = (preview.body as PassTimeBody).characters[0].result;
    expect(previewResult).toMatchObject({ hpBefore: expect.any(Number) as unknown, hpAfter: expect.any(Number) as unknown });
    expect((real.body as PassTimeBody).characters[0].result).toEqual(previewResult);
  });

  it('leaves an excluded character as it was', async () => {
    const response = await as('owner').post(`${base()}/pass-time`, {
      days: 1,
      hours: 0,
      characters: [{ characterId, activity: 'excluded' }],
      version: game.version,
    });
    expect(response.status).toBe(200);
    expect((response.body as PassTimeBody).characters[0]).toEqual({
      characterId,
      name: expect.any(String) as unknown,
      activity: 'excluded',
    });
  });

  it('stamps the day of the campaign on the healing log', async () => {
    await as('owner').post(`${base()}/pass-time`, { days: 3, hours: 0, version: game.version });
    const log = await as('owner').get(`/v1/characters/${characterId}/healing-log`);
    expect((log.body as { content: { kind: string; gameDay?: number }[] }).content[0]).toMatchObject({ kind: 'rest', gameDay: 4 });
    const injured = await as('owner').post(`/v1/characters/${characterId}/injuries`, { type: 'skin-tissue', penalty: -5 });
    expect(injured.status).toBe(200);
    expect((injured.body as { injuries: { gameDay?: number }[] }).injuries.slice(-1)[0].gameDay).toBe(4);
  });

  it('only lets the owner of the game or an admin pass time', async () => {
    expect((await as('other').post(`${base()}/pass-time`, { days: 1, hours: 0, version: game.version })).status).toBe(403);
    expect((await as('other').get(`${base()}/time-log`)).status).toBe(403);
    expect((await as('admin').post(`${base()}/pass-time`, { days: 1, hours: 0, version: game.version })).status).toBe(200);
  });

  it('rejects no time, too many days, a stale version and characters of another game', async () => {
    const post = (body: object) => as('owner').post(`${base()}/pass-time`, { days: 1, hours: 0, version: game.version, ...body });
    expect((await post({ days: 0 })).body).toMatchObject({ statusCode: 400, code: 'err-pass-time-required' });
    expect((await post({ days: 366 })).status).toBe(400);
    expect((await post({ hours: 24 })).status).toBe(400);
    expect((await post({ characters: [{ characterId: 'nope', activity: 'rest' }] })).body).toMatchObject({
      code: 'err-pass-time-character-not-in-game',
    });
    expect((await post({ characters: [{ characterId, activity: 'sleep' }] })).status).toBe(400);
    expect((await post({})).status).toBe(200);
    const stale = await post({});
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: 'version-conflict' });
    expect((await current()).calendar.currentDay).toBe(2);
  });

  it('corrects the calendar by hand with an adjust entry and no effects', async () => {
    const response = await as('owner').patch(base(), { calendar: { startDate: 'Spring', elapsedDays: 9 }, version: game.version });
    expect(response.status).toBe(200);
    expect((response.body as GameBody).calendar).toMatchObject({ startDate: 'Spring', elapsedDays: 9, currentDay: 10 });
    const log = (await as('owner').get(`${base()}/time-log`)).body as TimeLogBody;
    expect(log.content).toEqual([expect.objectContaining({ type: 'adjust', fromDay: 1, toDay: 10, characters: [] })]);
    const healing = (await as('owner').get(`/v1/characters/${characterId}/healing-log`)).body as { content: unknown[] };
    expect(healing.content).toHaveLength(0);
    // Only the start date: no log entry
    await as('owner').patch(base(), { calendar: { startDate: 'Summer' } });
    expect(((await as('owner').get(`${base()}/time-log`)).body as TimeLogBody).pagination.totalElements).toBe(1);
  });

  it('deletes the time log with its game', async () => {
    await as('owner').post(`${base()}/pass-time`, { days: 1, hours: 0, version: game.version });
    expect((await request(e2e.server).delete(base()).set('Authorization', e2e.auth('owner'))).status).toBe(204);
    const remaining = await e2e.connection.collection('game-time-log').countDocuments({ gameId: game.id });
    expect(remaining).toBe(0);
  });
});

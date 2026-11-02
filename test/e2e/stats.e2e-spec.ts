import request from 'supertest';
import type { StrategicStats } from '../../src/modules/stats/domain/strategic-stats.js';
import { startApp, type E2eApp } from './support/app.js';

const NOW = new Date();
const monthsAgo = (months: number) => new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - months, 2));
const month = (date: Date) => date.toISOString().slice(0, 7);

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  const db = e2e.connection;
  await db.collection('strategic-games').insertMany([
    { _id: 'g1', name: 'A', status: 'open', createdAt: NOW },
    { _id: 'g2', name: 'B', status: 'open', createdAt: monthsAgo(2) },
    { _id: 'g3', name: 'C', status: 'closed', createdAt: monthsAgo(24) },
  ] as never[]);
  await db.collection('characters').insertMany([
    { _id: 'c1', name: 'A', status: 'created', createdAt: NOW },
    { _id: 'c2', name: 'B', status: 'dead', createdAt: NOW },
  ] as never[]);
});

afterAll(async () => {
  await e2e?.stop();
});

const stats = (body: unknown) => body as StrategicStats;

describe('GET /v1/stats (spec 053)', () => {
  it('counts by status and by month of creation for an administrator', async () => {
    const response = await request(e2e.server).get('/v1/stats').set('Authorization', e2e.auth('admin'));
    expect(response.status).toBe(200);
    const body = stats(response.body);
    expect(body.campaigns.total).toBe(3);
    expect(body.campaigns.byStatus).toEqual({ open: 2, closed: 1 });
    expect(body.campaigns.createdByMonth).toHaveLength(12);
    expect(body.campaigns.createdByMonth.at(-1)).toEqual({ month: month(NOW), count: 1 });
    expect(body.campaigns.createdByMonth.find(entry => entry.month === month(monthsAgo(2)))?.count).toBe(1);
    expect(body.characters).toMatchObject({ total: 2, byStatus: { created: 1, dead: 1 } });
    expect(body.factions.total).toBe(0);
    expect(body.factions.byStatus).toBeUndefined();
  });

  it('is forbidden to a user who is not an administrator', async () => {
    const response = await request(e2e.server).get('/v1/stats').set('Authorization', e2e.auth('owner'));
    expect(response.status).toBe(403);
  });

  it('requires a token', async () => {
    expect((await request(e2e.server).get('/v1/stats')).status).toBe(401);
  });
});

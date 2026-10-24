import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createItem, gameWithFaction } from './support/builders.js';

/** POST /v1/characters/{id}/tactical-outcomes, called by rmu-api-tactical with its client credentials token. */
describe('tactical outcomes (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;
  let characterId: string;
  let maxHp: number;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    const { game, faction } = await gameWithFaction(e2e);
    gameId = game.id;
    factionId = faction.id;
    // The character is of a player (`other`) in the game of `owner`
    const character = await createCharacter(e2e, gameId, factionId, 'other');
    characterId = character.id;
    maxHp = (character as unknown as { hp: { max: number } }).hp.max;
    e2e.events.clear();
  });

  const post = (user: UserName, body: object, id = characterId) =>
    request(e2e.server).post(`/v1/characters/${id}/tactical-outcomes`).set('Authorization', e2e.auth(user)).send(body);

  const outcome = (overrides: Record<string, unknown> = {}) => ({
    tacticalGameId: 'tactical-001',
    tacticalGameName: 'E2E skirmish',
    actorId: 'actor-001',
    characterId,
    name: 'E2E character',
    hp: { start: maxHp, end: maxHp - 5, delta: -5 },
    injuries: [],
    ...overrides,
  });

  it('applies the outcome for the service account, once per tactical game', async () => {
    const first = await post('service', outcome());
    expect(first.status).toBe(200);
    // The character of the fakes has no hits (hp.max 0): the merger clamps the damage, the log keeps the outcome
    expect(first.body).toMatchObject({ id: characterId, hp: { max: maxHp } });
    expect(e2e.events.topics()).toEqual(['internal.rmu-strategic.character.updated.v1']);

    e2e.events.clear();
    const again = await post('service', outcome({ hp: { start: maxHp - 5, end: maxHp - 10, delta: -5 } }));
    expect(again.status).toBe(200);
    expect(e2e.events.topics()).toEqual([]);

    const log = await request(e2e.server).get(`/v1/characters/${characterId}/healing-log`).set('Authorization', e2e.auth('owner'));
    expect(log.status).toBe(200);
    expect((log.body as { content: { kind: string; tacticalGameId?: string }[] }).content).toEqual([
      expect.objectContaining({ kind: 'tactical-outcome', tacticalGameId: 'tactical-001' }),
    ]);
  });

  it('lets an admin and the owner of the game apply it, not the owner of the character, another user or a token without groups', async () => {
    expect((await post('other', outcome())).status).toBe(403);
    expect((await post('noRole', outcome())).status).toBe(403);
    expect((await post('owner', outcome())).status).toBe(200);
    expect((await post('admin', outcome({ tacticalGameId: 'tactical-002' }))).status).toBe(200);
    expect((await request(e2e.server).post(`/v1/characters/${characterId}/tactical-outcomes`).send(outcome())).status).toBe(401);
  });

  it('adds the item modifiers of the game, dropping the temporary ones', async () => {
    const item = await createItem(e2e, { gameId, characterId }, 'other');
    const createdAt = '2026-10-24T10:00:00.000Z';
    const response = await post(
      'service',
      outcome({
        items: [
          {
            itemId: item.id,
            modifiers: [
              {
                id: 'm-1',
                type: 'breakage',
                value: -20,
                appliesTo: 'all',
                createdAt,
                source: { kind: 'tactical', tacticalGameId: 'tactical-001' },
              },
              { id: 'm-2', type: 'breakage', value: -10, appliesTo: 'all', temporary: true, createdAt },
            ],
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    const stored = await request(e2e.server).get(`/v1/items/${item.id}`).set('Authorization', e2e.auth('other'));
    expect((stored.body as { modifiers: { id: string }[] }).modifiers.map(m => m.id)).toEqual(['m-1']);
  });

  it('rejects an outcome of another character, an invalid outcome and an unknown character', async () => {
    expect((await post('service', outcome({ characterId: 'someone-else' }))).status).toBe(400);
    expect((await post('service', outcome({ injuries: [{ id: 'i-1', type: 'magic', severity: 'minor' }] }))).status).toBe(400);
    expect((await post('service', { tacticalGameId: 'tactical-001' })).status).toBe(400);
    expect((await post('service', outcome({ characterId: undefined }), 'character-missing')).status).toBe(404);
  });
});

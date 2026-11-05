import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame, createItem } from './support/builders.js';

type Body = Record<string, any>;

const OPTIONS = { experienceMultiplier: 1, fatigueMultiplier: 1, boardScaleMultiplier: 1, letality: 0 };

// Workspace spec 077 in strategic: load, talent purchase and fatigue. Invented data only.
describe('Core Law gaps (e2e, spec 077)', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body?: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body?: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    delete: (path: string, body?: object) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)).send(body),
  });

  const setup = async (options: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}) => {
    const game = await createGame(e2e, 'owner', { options: { ...OPTIONS, ...options } });
    const faction = await createFaction(e2e, game.id, 'owner', { management: { availableGold: 100 } });
    const character = await createCharacter(e2e, game.id, faction.id, 'owner', overrides);
    return { game, faction, character };
  };

  describe('load (B1)', () => {
    it('fits a new armor to its holder, counts it in the load once equipped and recalculates for an admin only', async () => {
      const { game, character } = await setup();
      const armor = await createItem(e2e, { gameId: game.id, characterId: character.id, itemTypeId: 'e2e-plate-torso' });
      expect((armor.armor as Body).fittedWeight).toBe(80);
      expect((armor.info as Body).weight).toBe(8);
      expect(armor.carried).toBe(false);

      const equipped = await as('owner').post(`/v1/characters/${character.id}/equipment`, { itemId: armor.id, slot: 'body' });
      expect(equipped.status, JSON.stringify(equipped.body)).toBe(201);
      const equipment = (equipped.body as Body).equipment as Body;
      expect(equipment.load).toEqual({ worn: 8, carried: 0, percent: 10 });
      expect(equipment.armorEncumbrance).toBe(10);
      expect(equipment.weight).toBe(8);

      expect((await as('owner').post(`/v1/characters/${character.id}/recalculate`)).status).toBe(403);
      const recalculated = await as('admin').post(`/v1/characters/${character.id}/recalculate`);
      expect(recalculated.status, JSON.stringify(recalculated.body)).toBe(200);
      expect(((recalculated.body as Body).equipment as Body).load).toEqual(equipment.load as Body);
      expect((await as('admin').post('/v1/characters/missing-character/recalculate')).status).toBe(404);
    });
  });
});

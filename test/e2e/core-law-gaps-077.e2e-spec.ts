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

  describe('talent purchase (C10-C13)', () => {
    const traits = (body: unknown) => (body as Body).traits as Body[];

    it('applies the purchase rules of the game option, links flaws and lowers a flaw', async () => {
      const { game, character } = await setup({ talentPurchaseRules: true }, { skills: [] });
      // Initial ranks are an admin correction of the sheet
      const ranks = await as('admin').post(`/v1/characters/${character.id}/skills`, { skillId: 'perception', ranks: 10 });
      expect(ranks.status, JSON.stringify(ranks.body)).toBe(201);
      expect((game.options as Body).talentPurchaseRules).toBe(true);
      const add = (body: object) => as('owner').post(`/v1/characters/${character.id}/traits`, body);

      const knack = await add({ traitId: 'e2e-knack', tier: 1, specialization: 'perception' });
      expect(knack.status, JSON.stringify(knack.body)).toBe(200);
      expect(traits(knack.body)[0].acquiredBy).toEqual([{ tier: 1, type: 'skill', value: 'perception' }]);
      const unmet = await add({ traitId: 'e2e-knack', tier: 2, specialization: 'perception' });
      expect(unmet.body).toMatchObject({ statusCode: 400, code: 'err-trait-prerequisite-unmet' });
      const milestone = await add({
        traitId: 'e2e-knack',
        tier: 2,
        specialization: 'perception',
        prerequisite: { type: 'milestone', note: 'Saved the town' },
      });
      expect(milestone.status, JSON.stringify(milestone.body)).toBe(200);

      const linked = await add({ traitId: 'e2e-weakness', tier: 2, linkedTo: { traitId: 'e2e-knack', specialization: 'perception' } });
      expect(linked.status, JSON.stringify(linked.body)).toBe(200);
      expect(traits(linked.body).find(t => t.traitId === 'e2e-weakness')).toMatchObject({ cost: -10, linkedTo: { traitId: 'e2e-knack' } });
      const blocked = await as('owner').delete(`/v1/characters/${character.id}/traits`, {
        traitId: 'e2e-knack',
        specialization: 'perception',
      });
      expect(blocked.body).toMatchObject({ code: 'err-trait-has-linked-flaws' });

      const lowered = await add({ traitId: 'e2e-weakness', tier: 1 });
      expect(lowered.status, JSON.stringify(lowered.body)).toBe(200);
      expect(traits(lowered.body).find(t => t.traitId === 'e2e-weakness')).toMatchObject({ tier: 1, cost: -5 });
      expect((await add({ traitId: 'e2e-knack', tier: 1, specialization: 'perception' })).body).toMatchObject({
        code: 'err-trait-tier-lower-talent',
      });
    });

    it('lets only the game master restrict a trait, and halves its cost', async () => {
      const { game, faction } = await setup();
      const mine = await createCharacter(e2e, game.id, faction.id, 'other');
      const path = `/v1/characters/${mine.id}/traits`;
      const body = { traitId: 'e2e-knack', tier: 1, specialization: 'perception', restricted: { note: 'Only at sea' } };
      expect((await as('other').post(path, body)).status).toBe(403);
      const restricted = await as('owner').post(path, body);
      expect(restricted.status, JSON.stringify(restricted.body)).toBe(200);
      expect(traits(restricted.body)[0]).toMatchObject({ cost: 3, restricted: { note: 'Only at sea' } });
    });

    it('gives the effective size of Increased Size to the sheet and keeps the size of the race', async () => {
      const { character } = await setup({}, { level: 1 });
      const before = (await as('owner').get(`/v1/characters/${character.id}`)).body as Body;
      const response = await as('owner').post(`/v1/characters/${character.id}/traits`, { traitId: 'increased-size', tier: 1 });
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      const sheet = response.body as Body;
      expect(sheet.info).toMatchObject({ sizeId: 'medium', effectiveSizeId: 'big' });
      expect((before.info as Body).effectiveSizeId).toBe('medium');
      expect((sheet.hp as Body).max).toBe(Math.round(((before.hp as Body).max as number) * 1.5));
    });
  });
});

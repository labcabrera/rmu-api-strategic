/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { characterBody, createCharacter, createFaction, createGame, gameBody } from './support/builders.js';
import { RACE } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 079, phase 8 (E, chapter 12): power level presets, power point recovery by power level, experience
 * for the group and starting wealth. Invented data only.
 */
describe('gamemastering (e2e, spec 079, E)', () => {
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
    post: (path: string, body: object = {}) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object = {}) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
  });
  const ok = (response: request.Response, status = 200): Body => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    return response.body as Body;
  };
  const powerLevel = (extra: Record<string, unknown>) => ({ ...(gameBody().powerLevel as Body), ...extra });
  const options = (extra: Record<string, unknown>) => ({ ...(gameBody().options as Body), ...extra });

  describe('power level', () => {
    it('stores the preset and the power point recovery, with the defaults of the Superior level', async () => {
      const plain = await createGame(e2e);
      expect(plain.powerLevel).toMatchObject({ preset: null, ppRecoveryPercent: 10 });
      expect(plain.options).toMatchObject({ startingWealth: 'none' });

      const heroic = await createGame(e2e, 'owner', { powerLevel: powerLevel({ preset: 'heroic', ppRecoveryPercent: 15 }) });
      expect(heroic.powerLevel).toMatchObject({ preset: 'heroic', ppRecoveryPercent: 15 });
      const read = ok(await as('owner').get(`/v1/strategic-games/${heroic.id}`));
      expect(read.powerLevel).toMatchObject({ preset: 'heroic', ppRecoveryPercent: 15 });

      const edited = ok(
        await as('owner').patch(`/v1/strategic-games/${heroic.id}`, { powerLevel: powerLevel({ preset: 'epic', ppRecoveryPercent: 30 }) }),
      );
      expect(edited.powerLevel).toMatchObject({ preset: 'epic', ppRecoveryPercent: 30 });
    });

    it('rejects an unknown preset and a recovery out of range', async () => {
      const bad = await as('owner').post('/v1/strategic-games', gameBody({ powerLevel: powerLevel({ preset: 'mythic' }) }));
      expect(bad.status).toBe(400);
      const tooMuch = await as('owner').post('/v1/strategic-games', gameBody({ powerLevel: powerLevel({ ppRecoveryPercent: 101 }) }));
      expect(tooMuch.status).toBe(400);
    });

    it('recovers the power points resting with the percent of the game', async () => {
      const game = await createGame(e2e, 'owner', { powerLevel: powerLevel({ preset: 'epic', ppRecoveryPercent: 25 }) });
      const faction = await createFaction(e2e, game.id);
      const info = { raceId: RACE.id, professionId: 'magician', sizeId: 'medium', realmTypes: ['essence'], height: 1.8, weight: 80 };
      const magician = ok(await as('owner').post('/v1/characters', characterBody(game.id, faction.id, { info })), 201);
      await as('owner').post(`/v1/characters/${magician.id}/skills`, { skillId: 'power-development', specialization: null, ranks: 0 });
      const leveled = ok(await as('owner').patch(`/v1/characters/${magician.id}/skills/power-development/level-up`));
      expect(leveled.power).toEqual({ max: 5, current: 5 });
      await as('owner').post(`/v1/characters/${magician.id}/power/spend`, { amount: 5 });
      const rested = ok(await as('owner').post(`/v1/characters/${magician.id}/rest`, { hours: 8 }));
      // 4 periods of 25% of 5: all of them (10% would give 2)
      expect(rested.power).toEqual({ max: 5, current: 5 });
    });

    it('prices the market with the preset of the game when no power level is sent', async () => {
      const game = await createGame(e2e, 'owner', { powerLevel: powerLevel({ preset: 'heroic' }) });
      const faction = await createFaction(e2e, game.id, 'owner', { management: { availableGold: 1000 } });
      const buyer = { kind: 'faction', id: faction.id };
      // The heroic multiplier (2 in the invented tables) goes on the 50 of magic of the 60 of the sword
      const quote = ok(
        await as('owner').post('/v1/items/price-quotes', { kind: 'purchase', itemTypeId: 'e2e-flame-sword', holder: buyer }),
      );
      expect(quote.price).toMatchObject({ unitBase: 110 });
      const superior = ok(
        await as('owner').post('/v1/items/price-quotes', {
          kind: 'purchase',
          itemTypeId: 'e2e-flame-sword',
          holder: buyer,
          powerLevel: 'superior',
        }),
      );
      expect(superior.price).toMatchObject({ unitBase: 60 });
      const bought = ok(await as('owner').post('/v1/items/purchases', { buyer, itemTypeId: 'e2e-flame-sword' }), 201);
      expect(bought.item).toMatchObject({ acquiredPrice: 110 });
    });
  });

  describe('experience for the group', () => {
    const setup = async () => {
      const game = await createGame(e2e);
      const faction = await createFaction(e2e, game.id);
      const first = await createCharacter(e2e, game.id, faction.id, 'owner', { name: 'First' });
      const second = await createCharacter(e2e, game.id, faction.id, 'other', { name: 'Second' });
      return { game, first, second };
    };

    it('gives the whole amount to every character of the game', async () => {
      const { game, first, second } = await setup();
      const result = ok(await as('owner').post(`/v1/strategic-games/${game.id}/xp`, { xp: 500, eventType: 'session' }));
      expect(result).toMatchObject({ gameId: game.id, xp: 500, eventType: 'session' });
      expect(result.characters).toHaveLength(2);
      for (const id of [first.id, second.id]) {
        const entry = result.characters.find((c: Body) => c.characterId === id);
        expect(entry).toMatchObject({ xpAfter: entry.xpBefore + 500 });
        expect(ok(await as('owner').get(`/v1/characters/${id}`)).experience.xp).toBe(entry.xpAfter);
      }
    });

    it('gives it only to the chosen characters', async () => {
      const { game, first, second } = await setup();
      const before = ok(await as('owner').get(`/v1/characters/${second.id}`)).experience.xp;
      const result = ok(await as('owner').post(`/v1/strategic-games/${game.id}/xp`, { xp: 1000, characterIds: [first.id] }));
      expect(result.characters.map((c: Body) => c.characterId)).toEqual([first.id]);
      expect(ok(await as('owner').get(`/v1/characters/${second.id}`)).experience.xp).toBe(before);
    });

    it('is for the masters of the game and checks the request', async () => {
      const { game } = await setup();
      expect((await as('other').post(`/v1/strategic-games/${game.id}/xp`, { xp: 500 })).status).toBe(403);
      expect((await as('owner').post(`/v1/strategic-games/${game.id}/xp`, { xp: 0 })).status).toBe(400);
      expect((await as('owner').post(`/v1/strategic-games/${game.id}/xp`, { xp: 10, eventType: 'party' })).status).toBe(400);
      expect((await as('owner').post(`/v1/strategic-games/${game.id}/xp`, { xp: 10, characterIds: ['nobody'] })).body).toMatchObject({
        code: 'err-group-xp-character-not-in-game',
      });
      expect((await as('owner').post('/v1/strategic-games/unknown/xp', { xp: 10 })).status).toBe(404);
    });
  });

  describe('starting wealth', () => {
    const coins = async (characterId: string) =>
      ok(await as('owner').get(`/v1/items?q=characterId==${characterId};itemTypeId==gold-coin`)).content as Body[];

    it('gives the silver pieces of the category per level as gold coins', async () => {
      const game = await createGame(e2e, 'owner', { options: options({ startingWealth: 'modest' }) });
      expect(game.options).toMatchObject({ startingWealth: 'modest' });
      const faction = await createFaction(e2e, game.id);
      const character = await createCharacter(e2e, game.id, faction.id, 'owner', { level: 2 });
      // 20 sp per level x 2 = 40 sp = 4 gp
      const stacks = await coins(character.id);
      expect(stacks).toHaveLength(1);
      expect(stacks[0]).toMatchObject({ amount: 4, carried: true });
      // The coins weigh: the sheet the creation answers is processed again with them, and stored
      expect((character.equipment as Body).weight).toBeGreaterThan(0);
      expect(ok(await as('owner').get(`/v1/characters/${character.id}`)).equipment.weight).toBe((character.equipment as Body).weight);
      const entries = ok(await as('owner').get('/v1/item-ledger?q=kind==starting-wealth')).content as Body[];
      expect(entries).toEqual([expect.objectContaining({ amount: 4, note: 'modest', to: { kind: 'character', id: character.id } })]);
    });

    it('gives nothing by default or at level 0', async () => {
      const plain = await createGame(e2e);
      const plainFaction = await createFaction(e2e, plain.id);
      const regular = await createCharacter(e2e, plain.id, plainFaction.id, 'owner', { level: 2 });
      expect(await coins(regular.id)).toEqual([]);

      const rich = await createGame(e2e, 'owner', { options: options({ startingWealth: 'rich' }) });
      const richFaction = await createFaction(e2e, rich.id);
      const novice = await createCharacter(e2e, rich.id, richFaction.id, 'owner', { level: 0 });
      expect(await coins(novice.id)).toEqual([]);
    });

    it('rejects an unknown wealth category', async () => {
      const bad = await as('owner').post('/v1/strategic-games', gameBody({ options: options({ startingWealth: 'filthy-rich' }) }));
      expect(bad.status).toBe(400);
    });
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- HTTP bodies read as loose JSON */
import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, gameWithFaction } from './support/builders.js';
import { maneuverCalls } from './support/fakes.js';

type Body = Record<string, any>;

/**
 * Workspace spec 079, block C in strategic: amputation and lost limbs (C1), healing without rest and strenuous failures
 * (C2), and the day of a death (C6), with the export format 14.
 */
describe('amputation, healing without rest and death (spec 079, e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;
  let characterId: string;
  let gameVersion: number;

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
    characterId = (await createCharacter(e2e, gameId, faction.id)).id;
    gameVersion = ((await as('owner').get(`/v1/strategic-games/${game.id}`)).body as { version: number }).version;
    maneuverCalls.results = [];
    maneuverCalls.totals = [];
    maneuverCalls.tables = [];
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    importFile: (path: string, file: object) =>
      request(e2e.server).post(path).set('Authorization', e2e.auth(user)).set('X-RMU-File-Name', 'test.rmu.json').send(file),
  });
  const ok = (response: request.Response, status = 200) => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    return response.body as Body;
  };
  const base = () => `/v1/characters/${characterId}`;
  const outcome = (props: Body) => ({
    tacticalGameId: 'tactical-079',
    actorId: 'actor-001',
    characterId,
    name: 'E2E character',
    hp: { start: 0, end: 0, delta: 0 },
    injuries: [],
    ...props,
  });
  const amputate = (body: Body) =>
    as('owner').post(`${base()}/amputations`, { healer: { name: 'Surgeon', bonus: 40 }, roll: 80, location: 'arm', side: 'left', ...body });

  describe('amputation (C1)', () => {
    it('a surgical amputation at -50 loses the limb and adds the three stump injuries', async () => {
      const body = ok(await amputate({ method: 'surgical' }));
      expect(maneuverCalls.totals).toEqual([80 + 40 - 50]);
      expect(maneuverCalls.tables).toEqual(['medical']);
      expect(body).toMatchObject({ result: 'success', difficulty: -50, total: 70, consequence: {} });
      expect(body.lostLimb).toMatchObject({ location: 'arm', side: 'left', cause: 'amputation', gameDay: 1 });
      expect(body.character.lostLimbs).toHaveLength(1);
      const stump = (body.character.injuries as Body[]).filter(injury => body.injuryIds.includes(injury.id));
      expect(stump.map(injury => injury.type)).toEqual(['bone', 'muscle-tendon', 'skin-tissue']);
      expect(stump.every(injury => injury.penalty === -40)).toBe(true);
      expect(body.breakdown).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'amputation-difficulty', value: -50, rule: '§13.1' })]),
      );

      const twice = await amputate({ method: 'surgical' });
      expect(twice.status).toBe(409);
      expect(twice.body).toMatchObject({ code: 'err-limb-already-lost' });
    });

    it('an emergency amputation at -30 is cauterized; a failure answers the critical, an absolute failure system shock', async () => {
      maneuverCalls.results = ['failure'];
      const failed = ok(await amputate({ method: 'emergency', location: 'leg', side: 'right' }));
      expect(maneuverCalls.totals).toEqual([80 + 40 - 30]);
      expect(failed.consequence).toEqual({ critical: { criticalType: 'S', criticalSeverity: 'D', resultShift: -1 } });
      expect(failed.injuryIds).toHaveLength(4);

      maneuverCalls.results = ['absolute-failure'];
      const shock = ok(await amputate({ method: 'emergency', location: 'arm', side: 'right' }));
      expect(shock.consequence).toEqual({ systemShock: { dice: 2 } });
      const log = ok(await as('owner').get(`${base()}/healing-log`));
      expect((log.content as Body[]).filter(entry => entry.kind === 'amputation')).toHaveLength(2);
    });

    it('validates the method and the limb', async () => {
      expect((await amputate({ method: 'magic' })).status).toBe(400);
      expect((await amputate({ method: 'surgical', location: 'head' })).status).toBe(400);
    });

    it('takes the limbs lost in a tactical game and exports and imports them (format 14)', async () => {
      const lost = { location: 'leg', side: 'left', at: '2026-11-05T10:00:00.000Z', cause: 'limb-loss', injuryId: 'injury-x' };
      const applied = ok(await as('service').post(`${base()}/tactical-outcomes`, outcome({ lostLimbs: [lost] })));
      expect(applied.lostLimbs).toEqual([{ ...lost, tacticalGameId: 'tactical-079', gameDay: 1 }]);

      const file = ok(await as('owner').get(`${base()}/export`));
      expect(file.formatVersion).toBe(14);
      expect(file.data.character.lostLimbs).toEqual([{ location: 'leg', side: 'left', at: lost.at, cause: 'limb-loss' }]);
      const result = ok(await as('owner').importFile(`/v1/factions/${factionId}/character-imports`, file));
      const imported = ok(await as('owner').get(`/v1/characters/${result.characterIds[0]}`));
      expect(imported.lostLimbs).toEqual([{ location: 'leg', side: 'left', at: lost.at, cause: 'limb-loss' }]);
    });
  });

  describe('healing without rest (C2)', () => {
    it('an active rest only recovers in the sleep hours and freezes the untreated injuries', async () => {
      // The fake character has no Body Development: its hits are set by hand
      await e2e.connection.collection('characters').updateOne({ _id: characterId as never }, { $set: { 'hp.max': 50, 'hp.current': 10 } });
      const injured = ok(await as('owner').post(`${base()}/injuries`, { type: 'bone', penalty: -10 }));
      const injuryId = (injured.injuries as Body[]).slice(-1)[0].id as string;
      ok(await as('owner').post(`${base()}/injuries/${injuryId}/recovery`, { roll: 50 }));

      const rested = ok(await as('owner').post(`${base()}/rest`, { days: 1, active: true, fullRest: true }));
      // 8 sleep hours: 4 periods of 10% of 50
      expect(rested.hp.current).toBe(30);
      const injury = (rested.injuries as Body[]).find(each => each.id === injuryId)!;
      expect(injury.recovery.remainingDays).toBe(injury.recovery.totalDays);
    });

    it('passes time with the active activity', async () => {
      const passed = ok(
        await as('owner').post(`/v1/strategic-games/${gameId}/pass-time`, {
          days: 1,
          hours: 0,
          version: gameVersion,
          characters: [{ characterId, activity: 'active' }],
        }),
      );
      expect(passed.characters[0]).toMatchObject({ activity: 'active', result: expect.any(Object) });
      expect(
        (
          await as('owner').post(`/v1/strategic-games/${gameId}/pass-time`, {
            days: 1,
            hours: 0,
            version: passed.game.version,
            characters: [{ characterId, activity: 'travel' }],
          })
        ).status,
      ).toBe(400);
    });

    it('a strenuous failure reopens a treated injury; its next recovery roll needs a new treatment', async () => {
      const injured = ok(await as('owner').post(`${base()}/injuries`, { type: 'bone', penalty: -10 }));
      const injuryId = (injured.injuries as Body[]).slice(-1)[0].id as string;
      const path = `${base()}/injuries/${injuryId}`;
      const untreated = await as('owner').post(`${path}/strenuous-failure`, { absolute: false });
      expect(untreated.status).toBe(400);
      expect(untreated.body).toMatchObject({ code: 'err-injury-not-treated' });

      ok(await as('owner').post(`${path}/treatments`, { procedure: 'splint', healer: { name: 'Healer', bonus: 10 }, roll: 50 }));
      ok(await as('owner').post(`${path}/recovery`, { roll: 50 }));
      const again = await as('owner').post(`${path}/recovery`, { roll: 50 });
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ code: 'err-injury-recovery-rolled' });

      const failed = ok(await as('owner').post(`${path}/strenuous-failure`, { absolute: true }));
      const injury = (failed.injuries as Body[]).find(each => each.id === injuryId)!;
      expect(injury).toMatchObject({ status: 'active', penalty: -20, strenuousFailure: { absolute: true, previousPenalty: -10 } });
      expect(injury.recovery).toBeUndefined();
      const blocked = await as('owner').post(`${path}/recovery`, { roll: 50 });
      expect(blocked.status).toBe(409);
      expect(blocked.body).toMatchObject({ code: 'err-injury-treatment-required' });

      ok(await as('owner').post(`${path}/treatments`, { procedure: 'splint', healer: { name: 'Healer', bonus: 10 }, roll: 50 }));
      ok(await as('owner').post(`${path}/recovery`, { roll: 50 }));
    });
  });

  describe('death (C6)', () => {
    it('a death of a tactical game keeps the day of the campaign, which the export leaves out', async () => {
      ok(
        await as('owner').post(`/v1/strategic-games/${gameId}/pass-time`, {
          days: 2,
          hours: 0,
          version: gameVersion,
          characters: [{ characterId, activity: 'excluded' }],
        }),
      );
      const dead = ok(await as('service').post(`${base()}/tactical-outcomes`, outcome({ fate: 'dead' })));
      expect(dead.status).toBe('dead');
      expect(dead.conditions).toEqual([expect.objectContaining({ status: 'dead', gameDay: 3 })]);
      const file = ok(await as('owner').get(`${base()}/export`));
      expect(file.data.character.conditions[0]).not.toHaveProperty('gameDay');
    });
  });
});

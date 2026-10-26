import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { characterBody, gameWithFaction } from './support/builders.js';
import { RACE } from './support/fakes.js';

type Skill = {
  skillId: string;
  specialization: string | null;
  ranks: number;
  statistics: string[];
  devPointsSpent: { normal: number; bonus: number };
};
type CharacterBody = {
  id: string;
  info: { realmType: string; realmTypes: string[] };
  skills: Skill[];
  power: { max: number; current: number } | null;
};

// Spec 029: spell lists of rmu-api-spells (fakes in support/fakes.ts), realms and power points.
describe('character magic (e2e)', () => {
  let e2e: E2eApp;
  let gameId: string;
  let factionId: string;

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
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)),
  });

  const magicianInfo = (realmTypes: string[]) => ({
    raceId: RACE.id,
    professionId: 'magician',
    sizeId: 'medium',
    realmTypes,
    height: 1.8,
    weight: 80,
  });

  const createMagician = async (): Promise<CharacterBody> => {
    const response = await as('owner').post('/v1/characters', characterBody(gameId, factionId, { info: magicianInfo(['essence']) }));
    expect(response.status).toBe(201);
    return response.body as CharacterBody;
  };

  const addSkill = (id: string, skillId: string, specialization: string | null) =>
    as('owner').post(`/v1/characters/${id}/skills`, { skillId, specialization, ranks: 0 });

  const levelUp = (id: string, skillId: string, specialization?: string) =>
    as('owner').patch(
      `/v1/characters/${id}/skills/${skillId}/level-up${specialization ? `?specialization=${encodeURIComponent(specialization)}` : ''}`,
    );

  const findSkill = (body: CharacterBody, specialization: string) => body.skills.find(s => s.specialization === specialization)!;

  describe('realms', () => {
    it('creates a character with the realms of its profession and still answers the deprecated realmType', async () => {
      const character = await createMagician();
      expect(character.info).toMatchObject({ realmTypes: ['essence'], realmType: 'essence' });
    });

    it('rejects realms the profession does not have', async () => {
      const wrong = await as('owner').post('/v1/characters', characterBody(gameId, factionId, { info: magicianInfo(['channeling']) }));
      expect(wrong.status).toBe(400);
      expect(wrong.body).toMatchObject({ code: 'err-invalid-realm' });
    });

    it('takes the deprecated realmType of older clients', async () => {
      const created = await as('owner').post('/v1/characters', characterBody(gameId, factionId));
      expect(created.status).toBe(201);
      expect((created.body as CharacterBody).info.realmTypes).toEqual(['essence']);
    });
  });

  describe('spell lists', () => {
    it('chooses the list skill from the list and the profession, whatever list skill is sent', async () => {
      const { id } = await createMagician();
      expect((await addSkill(id, 'open-spell-list', 'e2e-base')).status).toBe(201);
      expect((await addSkill(id, 'base-spell-list', 'e2e-other-base')).status).toBe(201);
      expect((await addSkill(id, 'base-spell-list', 'e2e-open')).status).toBe(201);
      const last = await addSkill(id, 'open-spell-list', 'e2e-evil');
      expect(last.status).toBe(201);
      const skills = (last.body as CharacterBody).skills.filter(s => s.skillId.endsWith('-spell-list'));
      expect(Object.fromEntries(skills.map(s => [s.specialization, s.skillId]))).toEqual({
        'e2e-base': 'base-spell-list',
        'e2e-other-base': 'restricted-spell-list',
        'e2e-open': 'open-spell-list',
        'e2e-evil': 'closed-spell-list',
      });
      // Spellcasting adds the realm stat twice
      expect(findSkill(last.body as CharacterBody, 'e2e-base').statistics).toEqual(['me', 'realm', 'realm']);
    });

    it('rejects lists of other realms, unknown lists and a list already learned', async () => {
      const { id } = await createMagician();
      expect((await addSkill(id, 'open-spell-list', 'e2e-channeling')).body).toMatchObject({ code: 'err-spell-list-wrong-realm' });
      expect((await addSkill(id, 'open-spell-list', 'e2e-missing')).body).toMatchObject({ code: 'err-spell-list-not-found' });
      expect((await addSkill(id, 'open-spell-list', 'e2e-base')).status).toBe(201);
      expect((await addSkill(id, 'closed-spell-list', 'e2e-base')).status).toBe(400);
    });

    it('develops the lists with the spells costs of the profession', async () => {
      const { id } = await createMagician();
      await addSkill(id, 'base-spell-list', 'e2e-base');
      await addSkill(id, 'base-spell-list', 'e2e-other-base');
      await levelUp(id, 'base-spell-list', 'e2e-base');
      await levelUp(id, 'base-spell-list', 'e2e-base');
      const response = await levelUp(id, 'restricted-spell-list', 'e2e-other-base');
      expect(response.status).toBe(200);
      const body = response.body as CharacterBody;
      // Normal or bonus development points, whatever pool paid them
      const spent = (skill: Skill) => [skill.ranks, skill.devPointsSpent.normal + skill.devPointsSpent.bonus];
      expect(spent(findSkill(body, 'e2e-base'))).toEqual([2, 3]);
      expect(spent(findSkill(body, 'e2e-other-base'))).toEqual([1, 6]);
    });

    it('lists the spells known up to the ranks of each list, with their power points', async () => {
      const { id } = await createMagician();
      await addSkill(id, 'base-spell-list', 'e2e-base');
      await levelUp(id, 'base-spell-list', 'e2e-base');
      await levelUp(id, 'base-spell-list', 'e2e-base');
      const response = await as('owner').get(`/v1/characters/${id}/spells`);
      expect(response.status).toBe(200);
      const [list] = response.body as {
        code: string;
        ranks: number;
        listTypeModifier: number;
        spells: { spell: { level: number }; powerPoints: number }[];
      }[];
      expect(list).toMatchObject({ code: 'e2e-base', spellListId: 'list-base', type: 'base', ranks: 2, listTypeModifier: 5 });
      expect(list.spells.map(s => [s.spell.level, s.powerPoints])).toEqual([
        [1, 1],
        [2, 0],
      ]);
      expect((await as('other').get(`/v1/characters/${id}/spells`)).status).toBe(403);
    });
  });

  describe('power points', () => {
    const withPower = async (): Promise<string> => {
      const { id } = await createMagician();
      await addSkill(id, 'power-development', null);
      const response = await levelUp(id, 'power-development');
      expect((response.body as CharacterBody).power).toEqual({ max: 5, current: 5 });
      return id;
    };

    it('spends and restores power points, never below zero nor above the maximum', async () => {
      const id = await withPower();
      const tooMuch = await as('owner').post(`/v1/characters/${id}/power/spend`, { amount: 6 });
      expect(tooMuch.status).toBe(400);
      expect(tooMuch.body).toMatchObject({ code: 'err-insufficient-power' });
      expect((await as('owner').post(`/v1/characters/${id}/power/spend`, { amount: 3 })).body).toMatchObject({ power: { current: 2 } });
      expect((await as('owner').post(`/v1/characters/${id}/power/restore`, { amount: 10 })).body).toMatchObject({ power: { current: 5 } });
      expect((await as('owner').post(`/v1/characters/${id}/power/spend`, { amount: 0 })).status).toBe(400);
      expect((await as('other').post(`/v1/characters/${id}/power/spend`, { amount: 1 })).status).toBe(403);
    });

    it('recovers power points resting', async () => {
      const id = await withPower();
      await as('owner').post(`/v1/characters/${id}/power/spend`, { amount: 5 });
      const rested = await as('owner').post(`/v1/characters/${id}/rest`, { hours: 8 });
      expect(rested.status).toBe(200);
      // 10% of 5 per 2 hours, 4 periods: 2 points
      expect(rested.body).toMatchObject({ power: { max: 5, current: 2 } });
    });

    it('refuses to spend without power points', async () => {
      const { id } = await createMagician();
      expect((await as('owner').post(`/v1/characters/${id}/power/spend`, { amount: 1 })).body).toMatchObject({ code: 'err-no-power' });
    });
  });
});

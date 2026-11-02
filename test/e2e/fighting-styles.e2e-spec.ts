import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { characterBody, gameWithFaction } from './support/builders.js';

type Skill = {
  skillId: string;
  specialization: string | null;
  ranks: number;
  styleAbilities?: { abilityId: string; times: number; cost: number }[];
  styleFreeRanks?: number;
  styleFreeRanksBonus?: number;
};
type CharacterBody = { id: string; skills: Skill[] };

// Workspace spec 032: ranks of a fighting style allocated to its abilities (made-up styles in support/fakes.ts).
describe('fighting styles (e2e)', () => {
  let e2e: E2eApp;
  let characterId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  const as = (user: UserName) => ({
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)),
    delete: (path: string) => request(e2e.server).delete(path).set('Authorization', e2e.auth(user)),
  });

  const styleSkill = (body: CharacterBody) => body.skills.find(s => s.skillId === 'combat-styles')!;
  const allocate = (abilityId: string, user: UserName = 'owner') =>
    as(user).post(`/v1/characters/${characterId}/skills/combat-styles/style-abilities`, { specialization: 'e2e-style', abilityId });
  const undo = (abilityId: string, user: UserName) =>
    as(user).delete(`/v1/characters/${characterId}/skills/combat-styles/style-abilities/${abilityId}?specialization=e2e-style`);

  // The game belongs to 'other' (the game master); 'owner' plays the character
  beforeEach(async () => {
    await e2e.clear();
    const { game, faction } = await gameWithFaction(e2e, 'other');
    const created = await as('owner').post('/v1/characters', characterBody(game.id, faction.id));
    expect(created.status).toBe(201);
    characterId = (created.body as CharacterBody).id;
    await as('owner')
      .post(`/v1/characters/${characterId}/skills`, { skillId: 'combat-styles', specialization: 'e2e-style', ranks: 0 })
      .expect(201);
    await as('owner').patch(`/v1/characters/${characterId}/skills/combat-styles/level-up?specialization=e2e-style`).expect(200);
    const levelled = await as('owner').patch(`/v1/characters/${characterId}/skills/combat-styles/level-up?specialization=e2e-style`);
    expect(levelled.status).toBe(200);
    expect(styleSkill(levelled.body as CharacterBody)).toMatchObject({
      ranks: 2,
      styleAbilities: [],
      styleFreeRanks: 2,
      styleFreeRanksBonus: 4,
    });
  });

  it('allocates free ranks to abilities and keeps the rest as OB', async () => {
    const basic = await allocate('e2e-basic').expect(200);
    expect(styleSkill(basic.body as CharacterBody)).toMatchObject({
      styleAbilities: [{ abilityId: 'e2e-basic', times: 1, cost: 2 }],
      styleFreeRanks: 0,
      styleFreeRanksBonus: 0,
    });
    const noRanks = await allocate('e2e-advanced').expect(400);
    expect(noRanks.body).toMatchObject({ code: 'err-style-ability-ranks' });
    const repeated = await allocate('e2e-basic').expect(400);
    expect(repeated.body).toMatchObject({ code: 'err-style-ability-repeated' });
  });

  it('checks the abilities required and how many times an ability can be selected', async () => {
    const missing = await allocate('e2e-advanced').expect(400);
    expect(missing.body).toMatchObject({ code: 'err-style-ability-requirements' });
    await allocate('e2e-repeatable').expect(200);
    const twice = await allocate('e2e-repeatable').expect(200);
    expect(styleSkill(twice.body as CharacterBody).styleAbilities).toEqual([{ abilityId: 'e2e-repeatable', times: 2, cost: 1 }]);
    const unknown = await allocate('e2e-unknown').expect(400);
    expect(unknown.body).toMatchObject({ code: 'err-style-ability-not-in-style' });
  });

  it('only lets the game master undo a selection, and a level down undoes the last ones', async () => {
    await allocate('e2e-repeatable').expect(200);
    await allocate('e2e-repeatable').expect(200);
    await undo('e2e-repeatable', 'owner').expect(403);
    const undone = await undo('e2e-repeatable', 'other').expect(200);
    expect(styleSkill(undone.body as CharacterBody).styleAbilities).toEqual([{ abilityId: 'e2e-repeatable', times: 1, cost: 1 }]);

    await allocate('e2e-repeatable').expect(200);
    const down = await as('owner').patch(`/v1/characters/${characterId}/skills/combat-styles/level-down?specialization=e2e-style`);
    expect(down.status).toBe(200);
    expect(styleSkill(down.body as CharacterBody)).toMatchObject({
      ranks: 1,
      styleAbilities: [{ abilityId: 'e2e-repeatable', times: 1, cost: 1 }],
      styleFreeRanks: 0,
    });
  });

  it('exports the selections with the skill', async () => {
    await allocate('e2e-basic').expect(200);
    const exported = await request(e2e.server)
      .get(`/v1/characters/${characterId}/export`)
      .set('Authorization', e2e.auth('owner'))
      .expect(200);
    const skills = (exported.body as { data: { character: { skills: Skill[] } } }).data.character.skills;
    expect(skills.find(s => s.skillId === 'combat-styles')).toMatchObject({
      styleAbilities: [{ abilityId: 'e2e-basic', times: 1, cost: 2 }],
    });
  });

  it('rejects skills that are not fighting styles', async () => {
    const res = await as('owner').post(`/v1/characters/${characterId}/skills/perception/style-abilities`, {
      specialization: 'e2e-style',
      abilityId: 'e2e-basic',
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'err-not-fighting-style' });
  });
});

import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';

type Body = Record<string, any>;

// Workspace spec 079, phase 7 (D2): sheet effects of Vigorous and Beast of Burden. Invented data only.
describe('Talents (e2e, spec 079, D2)', () => {
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
  });

  const setup = async () => {
    const game = await createGame(e2e, 'owner');
    const faction = await createFaction(e2e, game.id, 'owner');
    return createCharacter(e2e, game.id, faction.id, 'owner');
  };

  it('adds Vigorous to the endurance trait bonus', async () => {
    const character = await setup();
    const response = await as('owner').post(`/v1/characters/${character.id}/traits`, { traitId: 'vigorous', tier: 2 });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect((response.body as Body).endurance).toMatchObject({ traitBonus: 20 });
  });

  it('raises the load allowance with Beast of Burden and keeps the dodge penalty apart', async () => {
    const character = await setup();
    const before = (await as('owner').get(`/v1/characters/${character.id}`)).body as Body;
    const response = await as('owner').post(`/v1/characters/${character.id}/traits`, { traitId: 'beast-of-burden', tier: 1 });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const equipment = (response.body as Body).equipment as Body;
    const weight = (before.info as Body).weight as number;
    expect(equipment.weightAllowance).toBeCloseTo(((before.equipment as Body).weightAllowance as number) + weight / 10, 1);
    expect(typeof equipment.dodgeEncumbrancePenalty).toBe('number');
    expect(equipment.dodgeEncumbrancePenalty as number).toBeLessThanOrEqual(equipment.encumbrancePenalty as number);
  });
});

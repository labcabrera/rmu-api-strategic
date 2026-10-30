import request from 'supertest';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, gameWithFaction } from './support/builders.js';
import { maneuverCalls } from './support/fakes.js';

interface InjuryBody {
  id: string;
  severity: string;
  penalty: number;
  initialPenalty: number;
  bleeding?: number;
  bleedingControl?: string;
  status: string;
  permanent?: { penalty: number };
  recovery?: { untreated?: boolean; treatmentId?: string; totalDays: number };
  treatments: {
    difficulty: number;
    difficultySource?: string;
    total: number;
    result: string;
    heatCritical?: string;
    healer: { bonus: number; penalty?: number };
  }[];
}

interface CharacterBody {
  status: string;
  injuries: InjuryBody[];
  permanentCheckRequired?: boolean;
}

/** Health endpoints of spec 022 against the core fakes (treatment difficulties) and a scripted medical table. */
describe('character health (e2e)', () => {
  let e2e: E2eApp;
  let characterId: string;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    const { game, faction } = await gameWithFaction(e2e);
    characterId = (await createCharacter(e2e, game.id, faction.id)).id;
    maneuverCalls.results = [];
    maneuverCalls.totals = [];
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
  });
  const base = () => `/v1/characters/${characterId}`;

  /** Adds an injury and answers it. */
  const addInjury = async (body: Record<string, unknown>): Promise<InjuryBody> => {
    const response = await as('owner').post(`${base()}/injuries`, body);
    expect(response.status).toBe(200);
    return (response.body as CharacterBody).injuries.slice(-1)[0];
  };

  const treat = (injuryId: string, body: Record<string, unknown>) =>
    as('owner').post(`${base()}/injuries/${injuryId}/treatments`, { healer: { name: 'Healer', bonus: 10 }, roll: 50, ...body });

  const injuryOf = (response: request.Response, injuryId: string): InjuryBody =>
    (response.body as CharacterBody).injuries.find(i => i.id === injuryId)!;

  it('computes the treatment difficulty from core, one step harder on the head, and lets the master override it (D4/D5)', async () => {
    const injury = await addInjury({ type: 'skin-tissue', penalty: -5, location: 'head' });
    const preview = await as('owner').get(`${base()}/injuries/${injury.id}/treatment-difficulty?procedure=dress`);
    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({
      procedure: 'dress',
      grade: 'e',
      headSteps: 1,
      base: 20,
      bleedingModifier: 0,
      difficulty: 20,
      matched: true,
      applicable: true,
    });
    expect((await as('owner').get(`${base()}/injuries/${injury.id}/treatment-difficulty?procedure=nope`)).status).toBe(400);
    expect((await as('other').get(`${base()}/injuries/${injury.id}/treatment-difficulty?procedure=dress`)).status).toBe(403);

    const table = await treat(injury.id, { procedure: 'dress' });
    expect(table.status).toBe(200);
    expect(injuryOf(table, injury.id).treatments[0]).toMatchObject({ difficulty: 20, difficultySource: 'table', total: 80 });
    const override = await treat(injury.id, { procedure: 'dress', difficulty: -5 });
    expect(injuryOf(override, injury.id).treatments[1]).toMatchObject({ difficulty: -5, difficultySource: 'override', total: 55 });
    expect(maneuverCalls.totals).toEqual([80, 55]);
  });

  it('stitches halve the penalty and stop the bleeding of a medium injury, and are refused on a severe one (D2)', async () => {
    const medium = await addInjury({ type: 'cut-burn', penalty: -15, bleeding: 2 });
    expect(medium.severity).toBe('medium');
    const stitched = injuryOf(await treat(medium.id, { procedure: 'stitches' }), medium.id);
    expect(stitched).toMatchObject({ penalty: -7, initialPenalty: -7, bleeding: 0, bleedingControl: 'stitches', severity: 'light' });

    const severe = await addInjury({ type: 'cut-burn', penalty: -40, bleeding: 4 });
    const refused = await treat(severe.id, { procedure: 'stitches' });
    expect(refused.status).toBe(400);
    expect(refused.body).toMatchObject({ code: 'err-treatment-invalid-severity' });
  });

  it('pressure slows a heavy bleeding and cauterizing reports its heat critical (D5)', async () => {
    const injury = await addInjury({ type: 'cut-burn', penalty: -5, bleeding: 7 });
    const pressed = injuryOf(await treat(injury.id, { procedure: 'pressure' }), injury.id);
    expect(pressed).toMatchObject({ bleeding: 3, bleedingControl: 'pressure' });
    maneuverCalls.results = ['failure'];
    const cauterized = injuryOf(await treat(injury.id, { procedure: 'cauterize' }), injury.id);
    expect(cauterized).toMatchObject({ bleeding: 1, bleedingControl: 'cauterized' });
    expect(cauterized.treatments[1]).toMatchObject({ result: 'failure', heatCritical: 'C', difficulty: 30 - 15 });
  });

  it('an absolute failure worsens the penalty and its recovery base and counts as untreated (D1/D3)', async () => {
    const injury = await addInjury({ type: 'bone', penalty: -10 });
    maneuverCalls.results = ['absolute-failure'];
    const worsened = injuryOf(await treat(injury.id, { procedure: 'splint' }), injury.id);
    expect(worsened).toMatchObject({ penalty: -20, initialPenalty: -20, severity: 'medium' });
    const recovery = await as('owner').post(`${base()}/injuries/${injury.id}/recovery`, { roll: 37 });
    expect(recovery.status).toBe(200);
    expect((recovery.body as CharacterBody).permanentCheckRequired).toBe(true);
    expect(injuryOf(recovery, injury.id).recovery).toMatchObject({ untreated: true });
    // Workspace spec 052: the result explains its total and its days
    const explained = injuryOf(recovery, injury.id).recovery as unknown as {
      breakdown: { key: string; rule?: string; params?: Record<string, unknown> }[];
      days: Record<string, unknown>;
    };
    expect(explained.breakdown.find(each => each.key === 'healing-type')).toMatchObject({
      rule: 'Table 13-1a',
      params: { healingType: 'healing-type-none', procedure: 'procedure-splint' },
    });
    expect(explained.days).toMatchObject({ column: 'injury-type-bone', severity: 'injury-severity-medium' });
  });

  it('an untreated light injury recovers, once per treatment, and ends permanent (D3/D10)', async () => {
    const injury = await addInjury({ type: 'bone', penalty: -10 });
    const recovery = await as('owner').post(`${base()}/injuries/${injury.id}/recovery`, { roll: 37 });
    expect(recovery.status).toBe(200);
    expect((recovery.body as CharacterBody).permanentCheckRequired).toBe(true);
    const rolled = injuryOf(recovery, injury.id);
    expect(rolled).toMatchObject({ status: 'recovering', recovery: { untreated: true } });

    const again = await as('owner').post(`${base()}/injuries/${injury.id}/recovery`, { roll: 90 });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ code: 'err-injury-recovery-rolled' });

    const rested = await as('owner').post(`${base()}/rest`, { days: rolled.recovery!.totalDays });
    expect(rested.status).toBe(200);
    expect(injuryOf(rested, injury.id)).toMatchObject({ status: 'permanent', penalty: -10, permanent: { penalty: -10 } });
  });

  it('subtracts the injury penalties of the healer character from its Medicine (D10)', async () => {
    const injury = await addInjury({ type: 'bone', penalty: -10 });
    const response = await as('owner').post(`${base()}/injuries/${injury.id}/treatments`, {
      procedure: 'splint',
      healerCharacterId: characterId,
      roll: 50,
      difficulty: 0,
    });
    expect(response.status).toBe(200);
    const [treatment] = injuryOf(response, injury.id).treatments;
    expect(treatment.healer.penalty).toBe(-10);
    expect(maneuverCalls.totals).toEqual([50 + treatment.healer.bonus - 10]);
  });

  it('treats the injuries of a dead character but does not roll their recovery (D9)', async () => {
    const injury = await addInjury({ type: 'bone', penalty: -10 });
    const died = await request(e2e.server)
      .post(`${base()}/tactical-outcomes`)
      .set('Authorization', e2e.auth('service'))
      .send({
        tacticalGameId: 't-1',
        actorId: 'a-1',
        characterId,
        name: 'E2E character',
        hp: { start: 0, end: 0, delta: 0 },
        injuries: [],
        fate: 'dead',
      });
    expect((died.body as CharacterBody).status).toBe('dead');
    expect((await treat(injury.id, { procedure: 'splint' })).status).toBe(200);
    const recovery = await as('owner').post(`${base()}/injuries/${injury.id}/recovery`, { roll: 50 });
    expect(recovery.status).toBe(400);
    expect(recovery.body).toMatchObject({ code: 'err-character-dead' });
  });
});

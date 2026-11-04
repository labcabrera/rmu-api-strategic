import request from 'supertest';
import { startApp, type E2eApp } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';
import { REALM } from './support/fakes.js';

type Skill = {
  skillId: string;
  specialization: string | null;
  ranks: number;
  ranksDeveloped: number;
  talentRanks: number;
  devPointsSpent: { normal: number; bonus: number };
};
type Sheet = {
  id: string;
  experience: {
    level: number;
    availableDevPoints: number;
    availableBonusDevPoints: number;
    bonusDevPointsSpentThisLevel: number;
    savedDevPoints: number;
    intenseTrainingSkill: { skillId: string; specialization: string | null } | null;
  };
  skills: Skill[];
  attacks: { attackName: string; attackTable: string; weaponCategory: string; skillId: string; fumble: number; fumbleTable: string }[];
};

const OPTIONS = { experienceMultiplier: 1, fatigueMultiplier: 1, boardScaleMultiplier: 1, letality: 0 };

// Workspace spec 076, block A: development of characters. Invented data only.
describe('character development (e2e, spec 076)', () => {
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

  const send = (method: 'post' | 'patch', path: string, body?: object) =>
    request(e2e.server)[method](path).set('Authorization', e2e.auth('owner')).send(body);

  /** A character with three available levels in a game with the given options, still at level 0. */
  const setup = async (options: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}) => {
    const game = await createGame(e2e, 'owner', { options: { ...OPTIONS, ...options } });
    const faction = await createFaction(e2e, game.id);
    const character = await createCharacter(e2e, game.id, faction.id, 'owner', { level: 3, ...overrides });
    return { game, character };
  };

  const levelUp = (id: string, query = '') => send('post', `/v1/characters/${id}/level-up${query}`);
  const levelUpSkill = (id: string, skillId: string, query = '') =>
    send('patch', `/v1/characters/${id}/skills/${skillId}/level-up${query}`);
  const skillOf = (sheet: Sheet, skillId: string, specialization: string | null = null) =>
    sheet.skills.find(s => s.skillId === skillId && s.specialization === specialization)!;

  describe('game options', () => {
    it('accepts allowThirdRank as an alias of intenseTraining and never returns it', async () => {
      const created = await send('post', '/v1/strategic-games', {
        name: 'Alias',
        realmId: REALM.id,
        options: { ...OPTIONS, allowThirdRank: true },
        powerLevel: {
          baseDevPoints: 60,
          statRandomMin: 20,
          statBoostPotential: 0,
          statBoostTemporary: 0,
          statCreationBoost: 0,
          statCreationSwap: 0,
        },
      });
      expect(created.status).toBe(201);
      const options = (created.body as { options: Record<string, unknown> }).options;
      expect(options).toMatchObject({ intenseTraining: true, allowSavingDevPoints: false });
      expect(options).not.toHaveProperty('allowThirdRank');
    });
  });

  describe('pool choice', () => {
    it('pays a skill rank with bonus points first with pool=bonus, and rejects an unknown pool', async () => {
      const { character } = await setup();
      expect((await levelUp(character.id)).status).toBe(200);
      const response = await levelUpSkill(character.id, 'perception', '?pool=bonus');
      expect(response.status).toBe(200);
      const sheet = response.body as Sheet;
      expect(skillOf(sheet, 'perception').devPointsSpent).toEqual({ normal: 0, bonus: 2 });
      expect(sheet.experience).toMatchObject({ availableDevPoints: 60, availableBonusDevPoints: 48, bonusDevPointsSpentThisLevel: 2 });
      expect((await levelUpSkill(character.id, 'perception', '?pool=later')).status).toBe(400);
    });
  });

  describe('creation as a single level', () => {
    it('keeps the ranks developed at level 0 when leaving it, so a third rank needs intense training', async () => {
      const { character } = await setup();
      await levelUpSkill(character.id, 'perception').expect(200);
      await levelUpSkill(character.id, 'perception').expect(200);
      const sheet = (await levelUp(character.id).expect(200)).body as Sheet;
      expect(skillOf(sheet, 'perception')).toMatchObject({ ranks: 2, ranksDeveloped: 2 });
      expect(sheet.experience.bonusDevPointsSpentThisLevel).toBe(6);
      const third = await levelUpSkill(character.id, 'perception');
      expect(third.status).toBe(400);
      expect(third.body).toMatchObject({ code: 'err-skill-max-ranks-per-level' });
    });
  });

  describe('intense training', () => {
    it('lets a single lore skill go beyond two ranks and marks it', async () => {
      const { character } = await setup(
        { intenseTraining: true },
        {
          skills: [
            { skillId: 'perception', specialization: null, ranks: 0 },
            { skillId: 'language-spoken', specialization: 'north-tongue', ranks: 0 },
          ],
        },
      );
      await levelUp(character.id).expect(200);
      for (let i = 0; i < 3; i++) await levelUpSkill(character.id, 'language-spoken', '?specialization=north-tongue').expect(200);
      const sheet = (await request(e2e.server).get(`/v1/characters/${character.id}`).set('Authorization', e2e.auth('owner'))).body as Sheet;
      expect(sheet.experience.intenseTrainingSkill).toEqual({ skillId: 'language-spoken', specialization: 'north-tongue' });
      await levelUpSkill(character.id, 'perception').expect(200);
      await levelUpSkill(character.id, 'perception').expect(200);
      const taken = await levelUpSkill(character.id, 'perception');
      expect(taken.body).toMatchObject({ statusCode: 400, code: 'err-skill-intense-training-taken' });
    });
  });

  describe('saving development points', () => {
    it('fails with the code of the unspent points and keeps them with save=true when the game allows it', async () => {
      const { character } = await setup({ allowSavingDevPoints: true });
      await levelUp(character.id).expect(200);
      const blocked = await levelUp(character.id);
      expect(blocked.status).toBe(400);
      expect(blocked.body).toMatchObject({ code: 'err-level-up-unspent-dev-points', details: { unspent: 60 } });
      const saved = await levelUp(character.id, '?save=true');
      expect(saved.status).toBe(200);
      expect((saved.body as Sheet).experience).toMatchObject({ level: 2, availableDevPoints: 120, savedDevPoints: 60 });
    });

    it('rejects save=true without the game option, and force still loses the points', async () => {
      const { character } = await setup();
      await levelUp(character.id).expect(200);
      const rejected = await levelUp(character.id, '?save=true');
      expect(rejected.status).toBe(400);
      expect(rejected.body).toMatchObject({ code: 'err-dev-points-saving-not-allowed' });
      const forced = await levelUp(character.id, '?force=true');
      expect((forced.body as Sheet).experience).toMatchObject({ level: 2, availableDevPoints: 60, savedDevPoints: 0 });
    });
  });

  describe('multilingual', () => {
    it('grants 5 + 5 language ranks, creating the missing skill, and removes them with the talent', async () => {
      const { character } = await setup({}, { skills: [{ skillId: 'language-spoken', specialization: 'north-tongue', ranks: 0 }] });
      const languageRanks = [
        { skillId: 'language-spoken', specialization: 'north-tongue', ranks: 5 },
        { skillId: 'language-written', specialization: 'common-tongue', ranks: 5 },
      ];
      const wrong = await send('post', `/v1/characters/${character.id}/traits`, {
        traitId: 'multilingual',
        languageRanks: [{ ...languageRanks[0], ranks: 6 }, languageRanks[1]],
      });
      expect(wrong.body).toMatchObject({ statusCode: 400, code: 'err-multilingual-distribution' });
      const added = await send('post', `/v1/characters/${character.id}/traits`, { traitId: 'multilingual', languageRanks });
      expect(added.status).toBe(200);
      const sheet = added.body as Sheet;
      expect(skillOf(sheet, 'language-spoken', 'north-tongue')).toMatchObject({ ranks: 5, talentRanks: 5, ranksDeveloped: 0 });
      expect(skillOf(sheet, 'language-written', 'common-tongue')).toMatchObject({ ranks: 5, talentRanks: 5 });

      const deleted = await request(e2e.server)
        .delete(`/v1/characters/${character.id}/traits`)
        .set('Authorization', e2e.auth('owner'))
        .send({ traitId: 'multilingual' });
      expect(deleted.status).toBe(200);
      const after = deleted.body as Sheet;
      expect(skillOf(after, 'language-spoken', 'north-tongue')).toMatchObject({ ranks: 0, talentRanks: 0 });
      expect(skillOf(after, 'language-written', 'common-tongue')).toBeUndefined();
    });
  });

  describe('unarmed attacks', () => {
    it('exposes the attack of unarmed-st:strikes once it has a rank', async () => {
      const { character } = await setup({}, { skills: [{ skillId: 'unarmed-st', specialization: 'strikes', ranks: 0 }] });
      expect((character as unknown as Sheet).attacks).toEqual([]);
      const sheet = (await levelUpSkill(character.id, 'unarmed-st', '?specialization=strikes').expect(200)).body as Sheet;
      expect(sheet.attacks).toEqual([
        expect.objectContaining({
          attackName: 'unarmed-st-strikes',
          attackTable: 'unarmed-strikes',
          weaponCategory: 'unarmed',
          skillId: 'unarmed-st@strikes',
          fumbleTable: 'unarmed',
          fumble: 3,
        }),
      ]);
    });
  });
});

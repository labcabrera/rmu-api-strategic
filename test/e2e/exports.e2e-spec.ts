/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- HTTP bodies read as loose JSON */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { ITEM_REPOSITORY, type ItemRepository } from '../../src/modules/items/application/ports/item-repository.port.js';
import { UPCASTERS } from '../../src/modules/exports/domain/upcasters/index.js';
import { startApp, type E2eApp, type UserName } from './support/app.js';
import { createCharacter, createFaction, createGame } from './support/builders.js';
import { maneuverCalls } from './support/fakes.js';
import { V0_TEST_UPCASTER } from '../fixtures/exports/v0-test-upcaster.js';

type Body = Record<string, any>;

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'exports');
const readFixture = (path: string): Body => JSON.parse(readFileSync(join(FIXTURES, path), 'utf8'));

/** `UPDATE_FIXTURES=1 pnpm test:e2e` rewrites the example files of the current version from these exports. */
function storeFixture(path: string, file: Body) {
  if (process.env.UPDATE_FIXTURES !== '1') return;
  mkdirSync(dirname(join(FIXTURES, path)), { recursive: true });
  writeFileSync(join(FIXTURES, path), `${JSON.stringify(file, null, 2)}\n`);
}

/**
 * Workspace spec 024: export and import of characters and factions, with the invented catalog of fakes.ts. The
 * example files of test/fixtures/exports come from these exports.
 */
describe('export and import (e2e)', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  beforeEach(async () => {
    await e2e.clear();
    maneuverCalls.results = [];
    maneuverCalls.totals = [];
    maneuverCalls.tables = [];
  });

  const as = (user: UserName) => ({
    get: (path: string) => request(e2e.server).get(path).set('Authorization', e2e.auth(user)),
    post: (path: string, body: object) => request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body),
    patch: (path: string, body: object) => request(e2e.server).patch(path).set('Authorization', e2e.auth(user)).send(body),
    importFile: (path: string, file: object, fileName = 'test.rmu.json') =>
      request(e2e.server).post(path).set('Authorization', e2e.auth(user)).set('X-RMU-File-Name', fileName).send(file),
  });
  const characters = () => e2e.connection.collection('characters');
  const ok = (response: request.Response, status = 200) => {
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    return response.body as Body;
  };
  /** A call that only prepares the data: any 2xx. */
  const done = (response: request.Response) => {
    expect(response.status, JSON.stringify(response.body)).toBeLessThan(300);
    return response.body as Body;
  };

  const RECOVERING_INJURY = {
    id: 'injury-e2e-1',
    type: 'bone',
    severity: 'medium',
    location: 'arm',
    side: 'left',
    penalty: -15,
    initialPenalty: -20,
    source: { kind: 'manual' },
    treatments: [],
    recovery: {
      roll: 50,
      modifiers: 0,
      total: 50,
      baseDays: 10,
      multiplier: 1,
      totalDays: 10,
      remainingDays: 7,
      startedAt: '2026-10-01T00:00:00.000Z',
    },
    status: 'recovering',
    createdAt: '2026-10-01T00:00:00.000Z',
  };

  /** A character with a recovering injury, spent endurance, a lowered temporary stat, a damaged +5 sword equipped and gold. */
  async function veteran(gameId: string, factionId: string, user: UserName = 'owner', name = 'Veteran') {
    const character = await createCharacter(e2e, gameId, factionId, user, {
      name,
      skills: [
        { skillId: 'perception', specialization: null, ranks: 0 },
        { skillId: 'melee-weapon', specialization: 'sword', ranks: 0 },
      ],
    });
    // The game master buys with the gold of the faction (POST /v1/items is a purchase, spec 023)
    done(await as('owner').post(`/v1/factions/${factionId}/add-gold`, { gold: 100 }));
    const sword = done(await as('owner').post('/v1/items', { gameId, characterId: character.id, itemTypeId: 'longsword' }));
    done(
      await as('owner').post(`/v1/items/${sword.id}/modifiers`, { type: 'breakage', value: -10, appliesTo: 'all', description: 'Nicked' }),
    );
    done(await as('owner').post('/v1/items', { gameId, characterId: character.id, itemTypeId: 'gold-coin', amount: 25 }));
    await characters().updateOne(
      { _id: character.id as never },
      {
        $set: {
          injuries: [RECOVERING_INJURY],
          'endurance.current': 4,
          'endurance.accumulator': 2,
          'endurance.fatiguePenalty': -5,
          'statistics.st.temporary': 40,
          'hp.max': 20,
          'hp.current': 10,
          // 4 ranks of Body Development: 20 hits with the invented race
          'skills.$[body].ranks': 4,
        },
      },
      { arrayFilters: [{ 'body.skillId': 'body-development' }] },
    );
    // Equipping runs the character processor, which turns the ranks into 20 maximum hits
    done(await as('owner').post(`/v1/characters/${character.id}/equipment`, { itemId: sword.id, slot: 'mainHand' }));
    return { character, sword };
  }

  describe('a character', () => {
    it('exports it and imports it into a faction of another game, with its temporary state, equipment and gold', async () => {
      const source = await createGame(e2e);
      const sourceFaction = await createFaction(e2e, source.id);
      const { character } = await veteran(source.id, sourceFaction.id);

      const original = ok(await as('owner').get(`/v1/characters/${character.id}`));
      expect(original.hp.current).toBeLessThan(original.hp.max);
      const exported = await as('owner').get(`/v1/characters/${character.id}/export`);
      ok(exported);
      expect(exported.headers['content-disposition']).toMatch(/^attachment; filename="character-veteran-\d{8}\.rmu\.json"$/);
      const file = exported.body as Body;
      expect(file).toMatchObject({
        format: 'rmu-strategic-export',
        formatVersion: 8,
        kind: 'character',
        source: { app: 'rmu-api-strategic', gameId: source.id, factionId: sourceFaction.id, owner: 'e2e-owner' },
        data: { ref: 'c1', character: { name: 'Veteran', equipment: { slots: { mainHand: 'i1' } } } },
      });
      expect(file.data.character.hp).toEqual({ current: original.hp.current });
      expect(file.data.character).not.toHaveProperty('id');
      expect(file.data.character).not.toHaveProperty('owner');
      expect(file.data.character).not.toHaveProperty('appliedTacticalGames');
      expect(file.references.races).toEqual([{ id: 'race-001', name: 'E2E race' }]);
      storeFixture('v8/character.rmu.json', file);

      const target = await createGame(e2e, 'other');
      const targetFaction = await createFaction(e2e, target.id, 'other');
      const preview = ok(await as('other').importFile(`/v1/factions/${targetFaction.id}/character-imports?dryRun=true`, file));
      expect(preview).toMatchObject({
        kind: 'character',
        target: 'character',
        name: 'Veteran',
        formatVersion: 8,
        currentFormatVersion: 8,
        steps: [],
        summary: { characters: 1, items: 2, gold: 25 },
        errors: [],
      });
      expect(await characters().countDocuments()).toBe(1);

      const result = ok(await as('other').importFile(`/v1/factions/${targetFaction.id}/character-imports`, file, 'veteran.rmu.json'));
      expect(result).toMatchObject({ kind: 'character', factionId: targetFaction.id, itemCount: 2 });
      const [newId] = result.characterIds;
      expect(newId).not.toBe(character.id);

      const imported = ok(await as('other').get(`/v1/characters/${newId}`));
      // Spec 044, decision 4: the file has no category, the catalog of core gives it to every skill
      expect(imported.skills.length).toBeGreaterThan(0);
      for (const skill of imported.skills as Body[]) expect(skill.categoryId, skill.skillId as string).toEqual(expect.any(String));
      expect(imported).toMatchObject({
        gameId: target.id,
        faction: { id: targetFaction.id },
        owner: 'e2e-other',
        hp: original.hp,
        endurance: { current: 4, accumulator: 2, fatiguePenalty: -5 },
      });
      expect(imported.statistics.st.temporary).toBe(40);
      expect(imported.statistics.st.totalBonus).toBe(original.statistics.st.totalBonus);
      expect(imported.injuries).toEqual([
        expect.objectContaining({ id: 'injury-e2e-1', recovery: expect.objectContaining({ remainingDays: 7 }) }),
      ]);

      const items = ok(await as('other').get(`/v1/items?q=characterId==${newId}`)).content as Body[];
      const sword = items.find(item => item.itemTypeId === 'longsword')!;
      const gold = items.find(item => item.itemTypeId === 'gold-coin')!;
      expect(imported.equipment.slots.mainHand).toBe(sword.id);
      expect(sword.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'breakage', value: -10 }),
          expect.objectContaining({ type: 'quality', value: 5 }),
        ]),
      );
      expect(gold.amount).toBe(25);

      const ledger = ok(await as('other').get(`/v1/item-ledger?q=itemId==${sword.id}`)).content as Body[];
      expect(ledger).toEqual([
        expect.objectContaining({
          kind: 'import',
          to: { kind: 'character', id: newId },
          details: { formatVersion: 8, appVersion: file.source.appVersion, sourceGameName: 'E2E game', fileName: 'veteran.rmu.json' },
        }),
      ]);
    });

    it('lets only the owner, the game master or an admin export it', async () => {
      const game = await createGame(e2e);
      const faction = await createFaction(e2e, game.id);
      const character = await createCharacter(e2e, game.id, faction.id, 'other');
      expect((await as('noRole').get(`/v1/characters/${character.id}/export`)).status).toBe(403);
      const mine = await createCharacter(e2e, game.id, faction.id, 'owner');
      expect((await as('other').get(`/v1/characters/${mine.id}/export`)).status).toBe(403);
      ok(await as('other').get(`/v1/characters/${character.id}/export`));
      ok(await as('owner').get(`/v1/characters/${character.id}/export`));
      ok(await as('admin').get(`/v1/characters/${character.id}/export`));
    });
  });

  describe('a faction', () => {
    async function realm() {
      const game = await createGame(e2e);
      const faction = await createFaction(e2e, game.id, 'owner', { name: 'Realm', management: { availableGold: 100 } });
      const smith = await createCharacter(e2e, game.id, faction.id, 'owner', { name: 'Smith' });
      await veteran(game.id, faction.id, 'other', 'Soldier');
      await createCharacter(e2e, game.id, faction.id, 'owner', { name: 'Scout' });
      const crafted = done(
        await as('owner').post('/v1/items/crafts', {
          itemTypeId: 'sword',
          maneuver: { actorId: smith.id, skillId: 'metalcraft', bonus: 40, difficulty: 'h', roll: 90 },
          to: { kind: 'faction', id: faction.id },
          enhancements: [{ appliesTo: 'attack', value: 5, description: 'Fine edge' }],
          enhancementsCost: 20,
          name: 'Realm blade',
        }),
      );
      return { game, faction, smith, blade: crafted.item as Body };
    }

    it('exports it with its armory, gold and characters, and imports it into another game', async () => {
      const { game, faction } = await realm();
      const exported = await as('owner').get(`/v1/factions/${faction.id}/export`);
      const file = ok(exported);
      expect(exported.headers['content-disposition']).toMatch(/filename="faction-realm-\d{8}\.rmu\.json"/);
      expect(file.data.characters.map((entry: Body) => entry.character.name)).toEqual(['Smith', 'Soldier', 'Scout']);
      const blade = file.data.armory.find((item: Body) => item.name === 'Realm blade');
      expect(blade.modifiers).toEqual(
        expect.arrayContaining([expect.objectContaining({ source: expect.objectContaining({ kind: 'crafting', crafterRef: 'c1' }) })]),
      );
      storeFixture('v8/faction.rmu.json', file);

      const target = await createGame(e2e);
      const preview = ok(await as('owner').importFile(`/v1/strategic-games/${target.id}/faction-imports?dryRun=true`, file));
      expect(preview).toMatchObject({
        kind: 'faction',
        target: 'faction',
        name: 'Realm',
        summary: { characters: 3, items: file.data.armory.length + 2 },
        errors: [],
      });
      expect(preview.summary.gold).toBeCloseTo(file.data.faction.management.availableGold + 25);

      const result = ok(await as('owner').importFile(`/v1/strategic-games/${target.id}/faction-imports`, file));
      expect(result.characterIds).toHaveLength(3);
      const imported = ok(await as('owner').get(`/v1/factions/${result.factionId}`));
      expect(imported).toMatchObject({ gameId: target.id, name: 'Realm', management: file.data.faction.management });

      const armory = ok(await as('owner').get(`/v1/items?q=factionId==${result.factionId}`)).content as Body[];
      const newBlade = armory.find(item => item.name === 'Realm blade')!;
      const smithId = result.characterIds[0];
      expect(ok(await as('owner').get(`/v1/characters/${smithId}`)).name).toBe('Smith');
      expect(newBlade.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: expect.objectContaining({ kind: 'crafting', crafterId: smithId, crafterName: 'Smith' }) }),
        ]),
      );
      expect(newBlade.gameId).toBe(target.id);
      expect(game.id).not.toBe(target.id);

      const goldEntries = ok(await as('owner').get(`/v1/item-ledger?q=holderIds==${result.factionId}`)).content as Body[];
      expect(goldEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'import',
            itemId: null,
            payments: [{ holder: { kind: 'faction', id: result.factionId }, gold: imported.management.availableGold }],
          }),
        ]),
      );
    });

    it('exports the NPCs of the faction and imports those the importer can use (workspace spec 055)', async () => {
      const source = await createGame(e2e);
      const faction = await createFaction(e2e, source.id);
      ok(
        await as('owner').patch(`/v1/factions/${faction.id}`, {
          npcs: [
            { npcId: 'npc-wolf', name: 'Pack', count: 3, notes: 'Hungry' },
            { npcId: 'npc-guard', count: 2 },
          ],
        }),
      );
      const file = ok(await as('owner').get(`/v1/factions/${faction.id}/export`));
      expect(file.data.faction.npcs).toEqual([
        { npcId: 'npc-wolf', name: 'Pack', count: 3, notes: 'Hungry' },
        { npcId: 'npc-guard', name: 'E2E guard', count: 2, notes: null },
      ]);

      // The guard is a private NPC of e2e-owner: another user cannot use it
      const target = await createGame(e2e, 'other');
      const path = `/v1/strategic-games/${target.id}/faction-imports`;
      const preview = ok(await as('other').importFile(`${path}?dryRun=true`, file));
      expect(preview.errors).toEqual([]);
      expect(preview.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'import-warning-npc-skipped', kind: 'npc', id: 'npc-guard', path: 'data.faction.npcs[1]' }),
        ]),
      );
      const result = ok(await as('other').importFile(path, file));
      const imported = ok(await as('other').get(`/v1/factions/${result.factionId}`));
      expect(imported.npcs).toEqual([{ id: expect.any(String) as unknown, npcId: 'npc-wolf', name: 'Pack', count: 3, notes: 'Hungry' }]);

      // A faction file of version 7 has no NPCs
      const v7 = readFixture('v7/faction.rmu.json');
      const fromV7 = ok(await as('other').importFile(`/v1/strategic-games/${target.id}/faction-imports?dryRun=true`, v7));
      expect(fromV7).toMatchObject({ upgradedFrom: 7, steps: [{ from: 7, to: 8 }] });
    });

    it('keeps the material and the conditional modifiers of a crafted item (workspace spec 043)', async () => {
      const { faction, smith } = await realm();
      maneuverCalls.results = ['absolute-success'];
      done(
        await as('owner').post('/v1/items/crafts', {
          itemTypeId: 'sword',
          maneuver: { actorId: smith.id, bonus: 40, roll: 90 },
          to: { kind: 'faction', id: faction.id },
          name: 'Troll bane',
          quality: { materialId: 'e2e-steel', masterwork: 'circumstantial', circumstance: 'vs. trolls' },
        }),
      );
      const file = ok(await as('owner').get(`/v1/factions/${faction.id}/export`));
      const bane = file.data.armory.find((item: Body) => item.name === 'Troll bane');
      expect(bane.material).toEqual({ id: 'e2e-steel', bonus: 4, durability: 3, magical: false });
      expect(bane.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ value: 5, condition: 'vs. trolls' })]));

      const target = await createGame(e2e);
      const result = ok(await as('owner').importFile(`/v1/strategic-games/${target.id}/faction-imports`, file));
      const armory = ok(await as('owner').get(`/v1/items?q=factionId==${result.factionId}`)).content as Body[];
      const copy = armory.find(item => item.name === 'Troll bane')!;
      expect(copy.material).toEqual(bane.material);
      expect(copy.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ value: 5, condition: 'vs. trolls' })]));
    });

    it('takes one character of a faction file, with its items only', async () => {
      const { faction } = await realm();
      const file = ok(await as('owner').get(`/v1/factions/${faction.id}/export`));
      const target = await createGame(e2e, 'other');
      const targetFaction = await createFaction(e2e, target.id, 'other');
      const path = `/v1/factions/${targetFaction.id}/character-imports`;

      const choose = ok(await as('other').importFile(`${path}?dryRun=true`, file));
      expect(choose.errors).toEqual([expect.objectContaining({ code: 'export-character-ref-required' })]);
      expect(choose.characters.map((c: Body) => c.ref)).toEqual(['c1', 'c2', 'c3']);
      expect((await as('other').importFile(path, file)).body).toMatchObject({ statusCode: 422, code: 'export-character-ref-required' });

      const preview = ok(await as('other').importFile(`${path}?dryRun=true&characterRef=c2`, file));
      expect(preview).toMatchObject({
        name: 'Soldier',
        characterRef: 'c2',
        summary: { characters: 1, items: 2, gold: 25 },
        errors: [],
      });
      const result = ok(await as('other').importFile(`${path}?characterRef=c2`, file));
      expect(result.characterIds).toHaveLength(1);
      expect(await e2e.connection.collection('factions').countDocuments({ gameId: target.id })).toBe(1);
      expect(await e2e.connection.collection('items').countDocuments({ gameId: target.id })).toBe(2);
    });

    it('lets only the game master or an admin export or import a faction', async () => {
      const game = await createGame(e2e);
      const faction = await createFaction(e2e, game.id);
      expect((await as('other').get(`/v1/factions/${faction.id}/export`)).status).toBe(403);
      const file = ok(await as('owner').get(`/v1/factions/${faction.id}/export`));
      expect((await as('other').importFile(`/v1/strategic-games/${game.id}/faction-imports?dryRun=true`, file)).status).toBe(403);
      ok(await as('admin').importFile(`/v1/strategic-games/${game.id}/faction-imports`, file));
    });
  });

  describe('versions and validation', () => {
    let factionId: string;
    let character: Body;

    beforeEach(async () => {
      const game = await createGame(e2e);
      factionId = (await createFaction(e2e, game.id)).id;
      character = readFixture('v8/character.rmu.json');
    });

    const importPath = () => `/v1/factions/${factionId}/character-imports`;

    it('imports a v8 example file as it is', async () => {
      ok(await as('owner').importFile(importPath(), character));
    });

    it('upgrades a v1 file adding the realms (spec 029)', async () => {
      const preview = ok(await as('owner').importFile(`${importPath()}?dryRun=true`, readFixture('v1/character.rmu.json')));
      expect(preview).toMatchObject({
        formatVersion: 1,
        upgradedFrom: 1,
        steps: [
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4 },
          { from: 4, to: 5 },
          { from: 5, to: 6 },
          { from: 6, to: 7 },
          { from: 7, to: 8 },
        ],
        errors: [],
      });
    });

    it('upgrades an older file and shows the steps in the preview', async () => {
      UPCASTERS.push(V0_TEST_UPCASTER);
      try {
        const v0 = readFixture('v0/character.rmu.json');
        const preview = ok(await as('owner').importFile(`${importPath()}?dryRun=true`, v0));
        expect(preview).toMatchObject({
          formatVersion: 0,
          upgradedFrom: 0,
          steps: [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 5 },
            { from: 5, to: 6 },
            { from: 6, to: 7 },
            { from: 7, to: 8 },
          ],
          errors: [],
        });
        ok(await as('owner').importFile(importPath(), v0));
      } finally {
        UPCASTERS.splice(UPCASTERS.indexOf(V0_TEST_UPCASTER), 1);
      }
    });

    it('rejects a file of a newer format, an unknown file and an invalid one', async () => {
      const newer = await as('owner').importFile(`${importPath()}?dryRun=true`, { ...character, formatVersion: 99 });
      expect(newer.status).toBe(422);
      expect(newer.body).toMatchObject({ code: 'export-format-too-new', details: { fileVersion: 99, supportedVersion: 8 } });
      expect((await as('owner').importFile(importPath(), { hello: 'world' })).body).toMatchObject({
        statusCode: 422,
        code: 'export-unknown-format',
      });
      const invalid = structuredClone(character);
      invalid.data.character.injuries[0].type = 'paper-cut';
      const response = await as('owner').importFile(importPath(), invalid);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: 'export-invalid-file',
        details: { issues: [expect.objectContaining({ path: 'data.character.injuries[0].type' })] },
      });
      const strategic = await as('owner').importFile(`/v1/strategic-games/x/faction-imports`, character);
      expect(strategic.status).toBe(404);
    });

    it('blocks a missing race, and only warns about a missing trait, skill or item type', async () => {
      const missingRace = structuredClone(character);
      missingRace.data.character.info.raceId = 'race-404';
      const blocked = ok(await as('owner').importFile(`${importPath()}?dryRun=true`, missingRace));
      expect(blocked.errors).toEqual([expect.objectContaining({ code: 'export-missing-reference', kind: 'race', id: 'race-404' })]);
      expect((await as('owner').importFile(importPath(), missingRace)).body).toMatchObject({
        statusCode: 422,
        code: 'export-missing-reference',
      });

      const missingOthers = structuredClone(character);
      missingOthers.data.character.traits.push({
        traitId: 'trait-404',
        traitName: 'Lost talent',
        isTalent: true,
        tier: 1,
        cost: 0,
        specialization: null,
        paidWith: null,
      });
      missingOthers.data.character.skills.push({
        ...missingOthers.data.character.skills[0],
        skillId: 'skill-404',
        ranks: 3,
      });
      missingOthers.data.items[0].itemTypeId = 'item-404';
      const preview = ok(await as('owner').importFile(`${importPath()}?dryRun=true`, missingOthers));
      expect(preview.errors).toEqual([]);
      expect(preview.warnings.map((w: Body) => w.code)).toEqual(
        expect.arrayContaining(['import-warning-missing-trait', 'import-warning-missing-skill', 'import-warning-missing-item-type']),
      );
      const result = ok(await as('owner').importFile(importPath(), missingOthers));
      const imported = ok(await as('owner').get(`/v1/characters/${result.characterIds[0]}`));
      expect(imported.traits).toEqual(expect.arrayContaining([expect.objectContaining({ traitId: 'trait-404', missingReference: true })]));
      expect(imported.skills).toEqual(
        expect.arrayContaining([expect.objectContaining({ skillId: 'skill-404', ranks: 3, missingReference: true })]),
      );
      expect(imported.skills.find((skill: Body) => skill.skillId === 'skill-404').categoryId).toBeUndefined();
    });

    it('leaves nothing behind when the import fails halfway', async () => {
      const game = await createGame(e2e);
      const faction = await createFaction(e2e, game.id);
      await veteran(game.id, faction.id);
      await veteran(game.id, faction.id, 'owner', 'Second');
      const file = ok(await as('owner').get(`/v1/factions/${faction.id}/export`));
      const target = await createGame(e2e);

      const items = e2e.app.get<ItemRepository>(ITEM_REPOSITORY, { strict: false });
      const save = items.save.bind(items);
      let calls = 0;
      const spy = vi
        .spyOn(items, 'save')
        .mockImplementation(item => (++calls === 3 ? Promise.reject(new Error('forced failure')) : save(item)));
      try {
        expect((await as('owner').importFile(`/v1/strategic-games/${target.id}/faction-imports`, file)).status).toBe(500);
      } finally {
        spy.mockRestore();
      }
      for (const name of ['characters', 'items', 'factions']) {
        expect(await e2e.connection.collection(name).countDocuments({ importId: { $exists: true } })).toBe(0);
      }
      expect(await e2e.connection.collection('factions').countDocuments({ gameId: target.id })).toBe(0);
    });

    it('rejects a body above the limit of the import routes with export-too-large', async () => {
      const huge = { ...character, padding: 'x'.repeat(6 * 1024 * 1024) };
      const response = await as('owner').importFile(importPath(), huge);
      expect(response.status).toBe(413);
      expect(response.body).toMatchObject({ code: 'export-too-large' });
    });
  });
});

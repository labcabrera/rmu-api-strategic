import request from 'supertest';
import type { E2eApp, UserName } from './app.js';
import { PROFESSION, RACE, REALM } from './fakes.js';

const STAT_KEYS = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'] as const;

export const gameBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'E2E game',
  realmId: REALM.id,
  options: { experienceMultiplier: 1, fatigueMultiplier: 1, boardScaleMultiplier: 1, letality: 0 },
  powerLevel: {
    baseDevPoints: 60,
    statRandomMin: 20,
    statBoostPotential: 0,
    statBoostTemporary: 0,
    statCreationBoost: 0,
    statCreationSwap: 0,
  },
  shortDescription: 'Short',
  description: 'Long',
  ...overrides,
});

export const characterBody = (gameId: string, factionId: string, overrides: Record<string, unknown> = {}) => ({
  name: 'E2E character',
  gameId,
  factionId,
  info: { raceId: RACE.id, professionId: PROFESSION.id, sizeId: 'medium', realmType: 'essence', height: 1.8, weight: 80 },
  statistics: Object.fromEntries(STAT_KEYS.map(key => [key, { potential: 70, temporary: 50 }])),
  level: 0,
  weaponDevelopment: ['melee', 'ranged', 'shield', 'unarmed'],
  skills: [{ skillId: 'perception', specialization: null, ranks: 0 }],
  roleplay: { gender: 'male', age: 30 },
  ...overrides,
});

type Created = { id: string } & Record<string, unknown>;

async function create(e2e: E2eApp, path: string, user: UserName, body: object): Promise<Created> {
  const response = await request(e2e.server).post(path).set('Authorization', e2e.auth(user)).send(body);
  if (response.status !== 201) throw new Error(`POST ${path} answered ${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as Created;
}

export const createGame = (e2e: E2eApp, user: UserName = 'owner', overrides: Record<string, unknown> = {}) =>
  create(e2e, '/v1/strategic-games', user, gameBody(overrides));

export const createFaction = (e2e: E2eApp, gameId: string, user: UserName = 'owner', overrides: Record<string, unknown> = {}) =>
  create(e2e, '/v1/factions', user, { gameId, name: 'E2E faction', ...overrides });

export const createCharacter = (
  e2e: E2eApp,
  gameId: string,
  factionId: string,
  user: UserName = 'owner',
  overrides: Record<string, unknown> = {},
) => create(e2e, '/v1/characters', user, characterBody(gameId, factionId, overrides));

export const createItem = (e2e: E2eApp, body: Record<string, unknown>, user: UserName = 'owner') =>
  create(e2e, '/v1/items', user, { itemTypeId: 'stone', ...body });

/** A game with one faction, both of `user`. */
export async function gameWithFaction(e2e: E2eApp, user: UserName = 'owner') {
  const game = await createGame(e2e, user);
  const faction = await createFaction(e2e, game.id, user);
  return { game, faction };
}

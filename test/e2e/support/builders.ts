import request from 'supertest';
import { USERS, type E2eApp, type UserName } from './app.js';
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

/**
 * Makes `user` a player of the game unless they own it or are an admin (spec 071: only players create characters).
 * The owner of the game answers 400 `member-owner`, which is fine.
 */
export async function joinAsPlayer(e2e: E2eApp, gameId: string, user: UserName): Promise<boolean> {
  if (user === 'admin' || user === 'service' || user === 'noRole') return false;
  const response = await request(e2e.server)
    .put(`/v1/strategic-games/${gameId}/members/${USERS[user].sub}`)
    .set('Authorization', e2e.auth('admin'))
    .send({ role: 'player' });
  if (response.status !== 200 && (response.body as { code?: string }).code !== 'member-owner') {
    throw new Error(`PUT members answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response.status === 200;
}

/** `user`, a player of the game, joins a faction as one of its players (spec 072): an admin adds them. */
export async function joinFaction(e2e: E2eApp, factionId: string, user: UserName): Promise<void> {
  const response = await request(e2e.server)
    .put(`/v1/factions/${factionId}/players/${USERS[user].sub}`)
    .set('Authorization', e2e.auth('admin'));
  if (response.status !== 200) throw new Error(`PUT faction players answered ${response.status}: ${JSON.stringify(response.body)}`);
}

/** `user` joins the game as a player and its faction as one of its players (the owner of the game is its master). */
export async function joinAsFactionPlayer(e2e: E2eApp, gameId: string, factionId: string, user: UserName): Promise<void> {
  if (await joinAsPlayer(e2e, gameId, user)) await joinFaction(e2e, factionId, user);
}

/** A character of `user`, who first joins the game as a player and the faction as one of its players. */
export async function createCharacter(
  e2e: E2eApp,
  gameId: string,
  factionId: string,
  user: UserName = 'owner',
  overrides: Record<string, unknown> = {},
) {
  await joinAsFactionPlayer(e2e, gameId, factionId, user);
  return create(e2e, '/v1/characters', user, characterBody(gameId, factionId, overrides));
}

export const createItem = (e2e: E2eApp, body: Record<string, unknown>, user: UserName = 'owner') =>
  create(e2e, '/v1/items', user, { itemTypeId: 'stone', ...body });

/** A game with one faction, both of `user`. */
export async function gameWithFaction(e2e: E2eApp, user: UserName = 'owner') {
  const game = await createGame(e2e, user);
  const faction = await createFaction(e2e, game.id, user);
  return { game, faction };
}

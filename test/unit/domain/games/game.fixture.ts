import type { GameProps } from '../../../../src/modules/games/domain/aggregates/game-props.js';
import { GameOptions } from '../../../../src/modules/games/domain/value-objects/game-options.vo.js';
import type { GamePowerLevel } from '../../../../src/modules/games/domain/value-objects/game-power-level.vo.js';

/** Props of a game for the tests. */
export const gameProps = (overrides: Partial<GameProps> = {}): GameProps => ({
  id: 'game-001',
  name: 'Campaign',
  realmId: 'realm-001',
  realmName: 'Realm',
  status: 'open',
  options: new GameOptions(1, 1, 1, 0),
  powerLevel: {} as GamePowerLevel,
  owner: 'master-001',
  accessType: 'private',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  ...overrides,
});

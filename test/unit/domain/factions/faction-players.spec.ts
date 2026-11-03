import { Faction, MAX_FACTION_PLAYERS } from '../../../../src/modules/factions/domain/aggregates/faction.js';
import { FactionManagement } from '../../../../src/modules/factions/domain/value-objects/faction-management.vo.js';
import { StrategicViewer } from '../../../../src/modules/factions/application/services/faction-access.service.js';

const faction = (players: string[] = []) =>
  Faction.fromProps({
    id: 'faction-1',
    gameId: 'game-1',
    name: 'North',
    management: new FactionManagement(0),
    shortDescription: undefined,
    description: undefined,
    imageUrl: undefined,
    owner: 'master',
    npcs: [],
    players,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: undefined,
  }).restoreVersion(0);

describe('faction players (spec 072)', () => {
  it('adds and removes players once, with an event only when the list changes', () => {
    const north = faction(['ana']);
    north.addPlayer('ana');
    expect(north.hasChanges()).toBe(false);
    north.addPlayer('bob');
    expect(north.players).toEqual(['ana', 'bob']);
    expect(north.hasChanges()).toBe(true);
    north.removePlayer('ana');
    expect(north.players).toEqual(['bob']);
    north.setPlayers(['bob', 'bob']);
    expect(north.players).toEqual(['bob']);
  });

  it('keeps at most 20 players', () => {
    const many = Array.from({ length: MAX_FACTION_PLAYERS + 1 }, (_, i) => `player-${i}`);
    expect(() => faction().setPlayers(many)).toThrow(expect.objectContaining({ code: 'faction-player-limit' }));
  });

  it('reads old documents without players as an empty list', () => {
    expect(Faction.fromProps({ ...faction().getProps(), players: undefined }).players).toEqual([]);
  });
});

describe('StrategicViewer.byLevel (spec 072, contract 18)', () => {
  it('gives manage to the masters, write to the players of the faction and read to the other members', () => {
    expect(StrategicViewer.byLevel('owner', false)).toBe('manage');
    expect(StrategicViewer.byLevel('master', false)).toBe('manage');
    expect(StrategicViewer.byLevel('player', true)).toBe('write');
    expect(StrategicViewer.byLevel('player', false)).toBe('read');
    // A spectator in the list of players (a role change) does not write
    expect(StrategicViewer.byLevel('spectator', true)).toBe('read');
    expect(StrategicViewer.byLevel('cover', true)).toBe('none');
    expect(StrategicViewer.byLevel('none', false)).toBe('none');
  });
});

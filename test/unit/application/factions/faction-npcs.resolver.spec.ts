import type { NpcClientPort, NpcResponse } from '../../../../src/modules/factions/application/ports/npc-client.port.js';
import { FactionNpcsResolver } from '../../../../src/modules/factions/application/services/faction-npcs.resolver.js';
import type { RealmClientPort } from '../../../../src/modules/games/application/ports/realm-client.port.js';
import { ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';

const NPCS: NpcResponse[] = [
  { id: 'wolf', name: 'Wolf', realmId: 'generic', accessType: 'public', owner: 'admin' },
  { id: 'guard', name: 'Guard', realmId: 'campaign', accessType: 'private', owner: 'owner-1' },
  { id: 'spy', name: 'Spy', realmId: 'campaign', accessType: 'private', owner: 'other-1' },
  { id: 'elf', name: 'Elf', realmId: 'other-realm', accessType: 'public', owner: 'admin' },
  { id: 'ghost', name: 'Ghost', realmId: 'missing-realm', accessType: 'public', owner: 'admin' },
];

const setup = () => {
  const npcClient = { getNpcById: vi.fn((id: string) => Promise.resolve(NPCS.find(npc => npc.id === id))) } satisfies NpcClientPort;
  const realmClient = {
    getRealmById: vi.fn((id: string) =>
      Promise.resolve(
        id === 'generic' ? { id, name: 'RMU Core', generic: true } : id === 'other-realm' ? { id, name: 'Other' } : undefined,
      ),
    ),
  } satisfies RealmClientPort;
  return { resolver: new FactionNpcsResolver(npcClient, realmClient), npcClient, realmClient };
};

const context = { owner: 'owner-1', realmId: 'campaign' };

describe('FactionNpcsResolver (workspace spec 055)', () => {
  it('accepts public NPCs of a generic realm and private ones of the owner, naming and identifying the new entries', async () => {
    const { resolver } = setup();

    const npcs = await resolver.resolve(
      [
        { npcId: 'wolf', count: 3 },
        { id: '6f1f7a52-2a34-4d1f-9a51-0f8a1c3b2e10', npcId: 'guard', name: 'Gate guards', count: 2, notes: 'At the gate' },
        { npcId: 'wolf', name: '', count: 1, notes: null },
      ],
      context,
    );

    expect(npcs.map(({ npcId, name, count, notes }) => ({ npcId, name, count, notes }))).toEqual([
      { npcId: 'wolf', name: 'Wolf', count: 3, notes: null },
      { npcId: 'guard', name: 'Gate guards', count: 2, notes: 'At the gate' },
      { npcId: 'wolf', name: 'Wolf', count: 1, notes: null },
    ]);
    expect(npcs[1].id).toBe('6f1f7a52-2a34-4d1f-9a51-0f8a1c3b2e10');
    expect(npcs[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(npcs[0].id).not.toBe(npcs[2].id);
  });

  it('reads each NPC and realm once per call', async () => {
    const { resolver, npcClient, realmClient } = setup();
    await resolver.resolve(
      [
        { npcId: 'wolf', count: 1 },
        { npcId: 'wolf', count: 2 },
      ],
      context,
    );
    expect(npcClient.getNpcById).toHaveBeenCalledTimes(1);
    expect(realmClient.getRealmById).toHaveBeenCalledTimes(1);
  });

  it('does not ask core for an NPC of the realm of the campaign', async () => {
    const { resolver, realmClient } = setup();
    await resolver.resolve([{ npcId: 'guard', count: 1 }], context);
    expect(realmClient.getRealmById).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown NPC', 'nobody', 'NPC nobody not found'],
    ['a private NPC of another user', 'spy', 'NPC spy is private and does not belong to the owner of the faction'],
    ['an NPC of a realm that is not generic', 'elf', 'NPC elf is not of the realm of the campaign nor of a generic realm'],
    ['an NPC of a realm core does not have', 'ghost', 'NPC ghost is not of the realm of the campaign nor of a generic realm'],
  ])('rejects %s with a 400', async (_, npcId, message) => {
    const { resolver } = setup();
    const result = resolver.resolve([{ npcId, count: 1 }], context);
    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toMatchObject({ statusCode: 400, code: 'validation', message });
  });

  it('gives the reason through the checker, which the import uses to skip an NPC', async () => {
    const check = setup().resolver.checker(context);
    await expect(check('wolf')).resolves.toMatchObject({ id: 'wolf' });
    await expect(check('spy')).resolves.toMatch(/is private/);
  });
});

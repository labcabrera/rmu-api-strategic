import { fakeEventPublisher } from '../../../support/fake-event-publisher.js';
import { mapRaceTraits } from '../../../../../src/modules/characters/application/services/race-traits.mapper.js';
import { UpdateCharacterRaceHandler } from '../../../../../src/modules/characters/application/cqrs/handlers/update-character-race.handler.js';
import { UpdateCharacterRaceCommand } from '../../../../../src/modules/characters/application/cqrs/commands/update-character-race.command.js';
import type { TraitClientPort, TraitResponse } from '../../../../../src/modules/characters/application/ports/trait-client.port.js';
import type { RaceClientPort, RaceTrait } from '../../../../../src/modules/characters/application/ports/race-client.port.js';
import type { CharacterRepository } from '../../../../../src/modules/characters/application/ports/character-repository.port.js';
import type { ProfessionClientPort } from '../../../../../src/modules/characters/application/ports/profession-client.port.js';
import type { ItemRepository } from '../../../../../src/modules/items/application/ports/item-repository.port.js';
import { CommandBus } from '@nestjs/cqrs';
import { CharacterProcessorService } from '../../../../../src/modules/characters/domain/services/character-processor.service.js';
import { ValidationError } from '../../../../../src/modules/shared/domain/errors/errors.js';
import { buildCharacter, trait } from './character.fixture.js';

const traitClient: TraitClientPort = {
  getTraitById: vi.fn((traitId: string) =>
    traitId === 'unknown'
      ? Promise.reject(new Error('not found'))
      : Promise.resolve({ id: traitId, name: `Name ${traitId}` } as TraitResponse),
  ),
};

describe('Race traits', () => {
  describe('Character.syncRaceTraits', () => {
    it('copies the race traits with source race and cost 0', () => {
      const character = buildCharacter({ traits: [trait('fast-attack', 1)] });
      character.syncRaceTraits([
        { traitId: 'inept', traitName: 'Inept', isTalent: false, tier: 5, specialization: 'endurance@swimming' },
        { traitId: 'nightvision', traitName: 'Nightvision', isTalent: true, tier: null, specialization: null },
      ]);
      expect(character.traits.map(t => [t.traitId, t.source, t.cost, t.tier, t.specialization])).toEqual([
        ['fast-attack', 'character', 10, 1, undefined],
        ['inept', 'race', 0, 5, 'endurance@swimming'],
        ['nightvision', 'race', 0, undefined, undefined],
      ]);
    });

    it('replaces the previous race traits on every sync', () => {
      const character = buildCharacter({ traits: [trait('darkvision', 1, undefined, 'race'), trait('fast-attack', 1)] });
      character.syncRaceTraits([{ traitId: 'tough', traitName: 'Tough', isTalent: true, tier: 2, specialization: null }]);
      expect(character.traits.map(t => `${t.traitId}:${t.source}`)).toEqual(['fast-attack:character', 'tough:race']);
    });

    it('keeps a character trait equal to a race trait', () => {
      const character = buildCharacter({ traits: [trait('prodigy', 1, 'survival')] });
      character.syncRaceTraits([{ traitId: 'prodigy', traitName: 'Prodigy', isTalent: true, tier: 2, specialization: 'survival' }]);
      expect(character.traits.map(t => `${t.traitId}:${t.source}`)).toEqual(['prodigy:character', 'prodigy:race']);
    });
  });

  describe('Character.deleteTrait', () => {
    it('rejects deleting a race trait with err-trait-from-race', () => {
      const character = buildCharacter({ traits: [trait('nightvision', undefined, undefined, 'race')] });
      expect(() => character.deleteTrait('nightvision', undefined)).toThrow(ValidationError);
      try {
        character.deleteTrait('nightvision', undefined);
      } catch (e) {
        expect((e as ValidationError).code).toBe('err-trait-from-race');
      }
      expect(character.traits).toHaveLength(1);
    });

    it('deletes the character copy and keeps the race copy of the same trait', () => {
      const character = buildCharacter({
        traits: [trait('prodigy', 2, 'survival', 'race'), trait('prodigy', 1, 'survival', 'character', 6)],
        devPoints: 10,
      });
      character.deleteTrait('prodigy', 'survival');
      expect(character.traits.map(t => t.source)).toEqual(['race']);
      expect(character.experience.availableDevPoints).toBe(16);
    });

    it('allows adding a character trait already granted by the race', () => {
      const character = buildCharacter({ traits: [trait('prodigy', 2, 'survival', 'race')] });
      character.addTrait('prodigy', 'Prodigy', true, 1, 6, 'survival');
      expect(character.traits.map(t => t.source)).toEqual(['race', 'character']);
      expect(() => character.addTrait('prodigy', 'Prodigy', true, 1, 6, 'survival')).toThrow(ValidationError);
    });
  });

  describe('mapRaceTraits', () => {
    it('reads the trait names from the catalog and falls back to the id', async () => {
      const result = await mapRaceTraits(
        [
          { id: 'a', traitId: 'prodigy', isTalent: true, tier: 2, specialization: 'survival' },
          { id: 'b', traitId: 'unknown', isTalent: false, tier: null, specialization: null },
        ],
        traitClient,
      );
      expect(result).toEqual([
        { traitId: 'prodigy', traitName: 'Name prodigy', isTalent: true, tier: 2, specialization: 'survival' },
        { traitId: 'unknown', traitName: 'unknown', isTalent: false, tier: null, specialization: null },
      ]);
    });

    it('returns an empty list when the race has no traits', async () => {
      expect(await mapRaceTraits(undefined, traitClient)).toEqual([]);
    });
  });

  describe('UpdateCharacterRaceHandler', () => {
    const setup = (raceTraits: RaceTrait[]) => {
      const character = buildCharacter({ traits: [trait('darkvision', 1, undefined, 'race'), trait('fast-attack', 1)] });
      const characterRepository = { findById: vi.fn().mockResolvedValue(character), update: vi.fn().mockResolvedValue(character) };
      const itemRepository = { findByCharacterId: vi.fn().mockResolvedValue([]) };
      const getRaceById = vi.fn().mockResolvedValue({ id: 'race-001', traits: raceTraits });
      const raceClient = { getRaceById } as RaceClientPort;
      const processorService = { process: vi.fn() } as unknown as CharacterProcessorService;
      const handler = new UpdateCharacterRaceHandler(
        processorService,
        characterRepository as unknown as CharacterRepository,
        itemRepository as unknown as ItemRepository,
        {} as ProfessionClientPort,
        fakeEventPublisher().publisher,
        raceClient,
        traitClient,
        { execute: vi.fn() } as unknown as CommandBus,
      );
      return { character, handler, getRaceById };
    };

    it('uses the traits of the event', async () => {
      const { character, handler, getRaceById } = setup([]);
      const command = UpdateCharacterRaceCommand.create({
        characterId: character.id,
        traits: [{ traitId: 'tough', isTalent: true, tier: 1 }],
      });
      await handler.execute(command);
      expect(getRaceById).not.toHaveBeenCalled();
      expect(character.traits.map(t => `${t.traitId}:${t.source}:${t.cost}`)).toEqual(['fast-attack:character:10', 'tough:race:0']);
      expect(character.traits[1].traitName).toBe('Name tough');
    });

    it('reads the race from core when the event has no traits', async () => {
      const { character, handler, getRaceById } = setup([{ traitId: 'nightvision', isTalent: true, tier: null }]);
      await handler.execute(UpdateCharacterRaceCommand.create({ characterId: character.id }));
      expect(getRaceById).toHaveBeenCalledWith('race-001');
      expect(character.traits.map(t => `${t.traitId}:${t.source}`)).toEqual(['fast-attack:character', 'nightvision:race']);
    });
  });
});

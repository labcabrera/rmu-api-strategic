import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { Faction } from '../../../factions/domain/aggregates/faction.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port.js';
import { type ItemLedgerRepository, ITEM_LEDGER_REPOSITORY } from '../../../items/application/ports/item-ledger-repository.port.js';
import { type ItemRepository, ITEM_REPOSITORY } from '../../../items/application/ports/item-repository.port.js';
import { Item } from '../../../items/domain/aggregates/item.js';
import type { ItemModifierSource } from '../../../items/domain/value-objects/item-modifier.vo.js';
import { NotFoundError } from '../../../shared/domain/errors/errors.js';
import {
  type CharacterFile,
  CURRENT_FORMAT_VERSION,
  EXPORT_APP,
  EXPORT_FORMAT,
  type ExportSource,
  type FactionFile,
} from '../../domain/format/export-format.js';
import {
  assignRefs,
  characterEntry,
  collectReferences,
  type CrafterLookup,
  exportFileName,
  factionToExport,
  itemToExport,
} from '../../domain/mappers/export.mappers.js';
import { appVersion } from './app-version.js';

export interface BuiltExport<F> {
  file: F;
  fileName: string;
}

type Crafter = { id: string | null; name: string | null };

const crafterKey = (source: ItemModifierSource): string | undefined =>
  source.crafterId ? `c:${source.crafterId}` : source.ledgerEntryId ? `l:${source.ledgerEntryId}` : undefined;

/** Builds the export file of a character or a faction (workspace spec 024, decisions 1-4). */
@Injectable()
export class ExportBuilder {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ITEM_LEDGER_REPOSITORY) private readonly ledgerRepository: ItemLedgerRepository,
  ) {}

  async characterFile(character: Character, faction: Faction, now = new Date()): Promise<BuiltExport<CharacterFile>> {
    const items = await this.itemRepository.findByCharacterId(character.id);
    const refs = assignRefs(
      [character.id],
      items.map(item => item.id),
    );
    const crafterOf = await this.crafters(items, [character]);
    const data = characterEntry(character, items, refs, crafterOf);
    const file: CharacterFile = {
      format: EXPORT_FORMAT,
      formatVersion: CURRENT_FORMAT_VERSION,
      kind: 'character',
      exportedAt: now.toISOString(),
      source: await this.source(character.gameId, faction, character.owner),
      references: collectReferences([data]),
      data,
    };
    return { file, fileName: exportFileName('character', character.name, now) };
  }

  async factionFile(faction: Faction, now = new Date()): Promise<BuiltExport<FactionFile>> {
    const armory = (await this.itemRepository.findByFactionId(faction.id)).filter(item => !item.characterId);
    const characters = (await this.characterRepository.findByGameId(faction.gameId))
      .filter(character => character.faction?.id === faction.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const itemsByCharacter = new Map<string, Item[]>();
    for (const character of characters) {
      itemsByCharacter.set(character.id, await this.itemRepository.findByCharacterId(character.id));
    }
    const allItems = [...armory, ...characters.flatMap(character => itemsByCharacter.get(character.id)!)];
    const refs = assignRefs(
      characters.map(character => character.id),
      allItems.map(item => item.id),
    );
    const crafterOf = await this.crafters(allItems, characters);
    const entries = characters.map(character => characterEntry(character, itemsByCharacter.get(character.id)!, refs, crafterOf));
    const armoryData = armory.map(item => itemToExport(item, refs, crafterOf));
    const file: FactionFile = {
      format: EXPORT_FORMAT,
      formatVersion: CURRENT_FORMAT_VERSION,
      kind: 'faction',
      exportedAt: now.toISOString(),
      source: await this.source(faction.gameId, faction, faction.owner),
      references: collectReferences(entries, armoryData),
      data: { faction: factionToExport(faction), armory: armoryData, characters: entries },
    };
    return { file, fileName: exportFileName('faction', faction.name, now) };
  }

  private async source(gameId: string, faction: Faction, owner: string): Promise<ExportSource> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) throw new NotFoundError('Game', gameId, 'err-game-not-found');
    return {
      app: EXPORT_APP,
      appVersion: appVersion(),
      gameId: game.id,
      gameName: game.name,
      realmId: game.realmId ?? null,
      realmName: game.realmName ?? null,
      factionId: faction.id,
      factionName: faction.name,
      owner: owner ?? null,
    };
  }

  /**
   * Who crafted or repaired each item: the character of the modifier source or, for modifiers before spec 024, the
   * actor of its ledger entry. Its name comes from the exported characters or from the repository.
   */
  private async crafters(items: Item[], known: Character[]): Promise<CrafterLookup> {
    const resolved = new Map<string, Crafter>();
    const names = new Map(known.map(character => [character.id, character.name]));
    const sources = items.flatMap(item =>
      (item.modifiers || [])
        .map(modifier => modifier.source)
        .filter((s): s is ItemModifierSource => s?.kind === 'crafting' || s?.kind === 'repair'),
    );
    for (const source of sources) {
      const key = crafterKey(source);
      if (!key || resolved.has(key)) continue;
      let crafterId = source.crafterId ?? null;
      if (!crafterId && source.ledgerEntryId) {
        crafterId = (await this.ledgerRepository.findById(source.ledgerEntryId))?.getProps().actorId ?? null;
      }
      let name = source.crafterName ?? null;
      if (crafterId && !names.has(crafterId)) {
        names.set(crafterId, (await this.characterRepository.findById(crafterId))?.name ?? '');
      }
      if (crafterId && names.get(crafterId)) name = names.get(crafterId)!;
      resolved.set(key, { id: crafterId, name });
    }
    return source => {
      const key = crafterKey(source);
      return key ? resolved.get(key) : undefined;
    };
  }
}

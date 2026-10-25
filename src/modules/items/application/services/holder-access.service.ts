import { Inject, Injectable } from '@nestjs/common';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../characters/application/ports/character-repository.port.js';
import { CharacterAccess } from '../../../characters/application/services/character-access.service.js';
import { Character } from '../../../characters/domain/aggregates/character.js';
import { type FactionRepository, FACTION_REPOSITORY } from '../../../factions/application/ports/faction-repository.port.js';
import { Faction } from '../../../factions/domain/aggregates/faction.js';
import { GameAccess } from '../../../games/application/services/game-access.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { type ItemHolder, ItemHolders } from '../../domain/value-objects/item-holder.vo.js';

/** A holder of items with what the operations need: its game, the character and its faction, or the faction. */
export interface HolderContext {
  holder: ItemHolder;
  gameId: string;
  character: Character | null;
  /** The faction itself, or the faction of the character. */
  faction: Faction;
}

/**
 * Who may act on the items and gold of a holder (workspace spec 023, decision 9):
 * - a character: its owner, the owner of the game or an admin (CharacterAccess);
 * - a faction (its armory and gold): the owner of the game or an admin.
 * A player may also give an item of their character to its faction or to another character of the same faction.
 */
@Injectable()
export class HolderAccess {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    @Inject(FACTION_REPOSITORY) private readonly factionRepository: FactionRepository,
    private readonly characterAccess: CharacterAccess,
    private readonly gameAccess: GameAccess,
  ) {}

  async load(holder: ItemHolder): Promise<HolderContext> {
    ItemHolders.validate(holder);
    if (holder.kind === 'character') {
      const character = await this.characterRepository.findById(holder.id);
      if (!character) throw new NotFoundError('Character', holder.id, 'err-character-not-found');
      const faction = await this.factionRepository.findById(character.faction.id);
      if (!faction) throw new NotFoundError('Faction', character.faction.id, 'err-faction-not-found');
      return { holder, gameId: character.gameId, character, faction };
    }
    const faction = await this.factionRepository.findById(holder.id);
    if (!faction) throw new NotFoundError('Faction', holder.id, 'err-faction-not-found');
    return { holder, gameId: faction.gameId, character: null, faction };
  }

  /** The faction of a character as a context of its own: the character pays the rest of a purchase with it. */
  factionOf(context: HolderContext): HolderContext {
    return { holder: { kind: 'faction', id: context.faction.id }, gameId: context.gameId, character: null, faction: context.faction };
  }

  async canManage(context: HolderContext, userId: string, roles: string[]): Promise<boolean> {
    if (context.character) return this.characterAccess.canChange(context.character, userId, roles);
    return this.gameAccess.canManage(await this.gameAccess.findGame(context.gameId), userId, roles);
  }

  async checkManage(context: HolderContext, userId: string, roles: string[]): Promise<void> {
    if (await this.canManage(context, userId, roles)) return;
    const what = context.character ? 'the items of this character' : 'the armory of this faction';
    throw new ForbiddenError(`You do not have permission to change ${what}`, 'err-holder-forbidden');
  }

  async isGameManager(gameId: string, userId: string, roles: string[]): Promise<boolean> {
    return this.gameAccess.canManage(await this.gameAccess.findGame(gameId), userId, roles);
  }

  /** Both holders are in the same game: items never leave their game. */
  checkSameGame(from: HolderContext, to: HolderContext): void {
    if (from.gameId !== to.gameId) {
      throw new ValidationError('Items cannot move between games', 'err-item-other-game');
    }
  }

  /**
   * A transfer: the source must be the user's to change, and a player who is not the game master can only give to
   * the faction of the character or to another character of that faction.
   */
  async checkTransfer(from: HolderContext, to: HolderContext, userId: string, roles: string[]): Promise<void> {
    this.checkSameGame(from, to);
    await this.checkManage(from, userId, roles);
    if (await this.isGameManager(from.gameId, userId, roles)) return;
    if (from.faction.id !== to.faction.id) {
      throw new ForbiddenError('Only the game master can give items to another faction', 'err-holder-forbidden');
    }
  }
}

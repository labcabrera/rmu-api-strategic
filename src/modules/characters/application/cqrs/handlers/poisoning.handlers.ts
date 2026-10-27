import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InventorySync } from '../../../../items/application/services/inventory-sync.service.js';
import { ItemLedger } from '../../../../items/application/services/item-ledger.service.js';
import { ItemStock } from '../../../../items/application/services/item-stock.service.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Character } from '../../../domain/aggregates/character.js';
import { openEndedRoll, PoisonRr, type PoisonRrResult } from '../../../domain/services/healing/poison-rr.js';
import type { Injury } from '../../../domain/value-objects/injury.vo.js';
import type { AntidoteData } from '../../../domain/value-objects/poison.vo.js';
import { type PoisonRulesClientPort, POISON_RULES_CLIENT } from '../../ports/poison-rules-client.port.js';
import { CharacterHealthStore } from '../../services/character-health.store.js';
import { GiveAntidoteCommand, PoisonCharacterCommand } from '../commands/poisoning.commands.js';

export interface PoisonCharacterResult {
  character: Character;
  rr: PoisonRrResult;
  /** The poisoning, when the RR failed (irritants make none). */
  injury?: Injury;
}

export interface GiveAntidoteResult {
  character: Character;
  injury: Injury;
  neutralized: boolean;
}

/**
 * A poison reaches the character and its RR is resolved at once (workspace spec 042, decisions 8-9): the poison bonus of
 * the sheet (or the game master's), the roll (rolled here when missing) and the modifiers against the poison level.
 */
@CommandHandler(PoisonCharacterCommand)
export class PoisonCharacterHandler implements ICommandHandler<PoisonCharacterCommand, PoisonCharacterResult> {
  constructor(
    private readonly store: CharacterHealthStore,
    @Inject(POISON_RULES_CLIENT) private readonly poisonRules: PoisonRulesClientPort,
  ) {}

  async execute(command: PoisonCharacterCommand): Promise<PoisonCharacterResult> {
    const character = await this.store.load(command.characterId, command.userId, command.roles, { allowCharacterOwner: false });
    if (character.status === 'dead') throw new ValidationError(`Character ${character.id} is dead`, 'err-character-dead');
    const bonus = command.bonus ?? character.resistances.find(each => each.resistance === 'poison')?.totalBonus ?? 0;
    const rr = PoisonRr.resolve(
      command.roll ?? openEndedRoll(),
      bonus,
      command.poison.level,
      command.modifiers,
      await this.poisonRules.getRrRules(),
    );
    const needsTable = !rr.resisted && command.poison.category !== 'irritant';
    const rows = needsTable ? (await this.poisonRules.getPoisonTables()).rows : [];
    const injury = character.poison(command.poison, { kind: 'manual' }, rr, rows);
    return { character: await this.store.save(character), rr, injury };
  }
}

/**
 * An antidote for a poisoning (decision 10). An `item` one is an herb of a character of the same game, read from its
 * catalog block, and one dose is spent; `external` and `magic` say what they are and spend nothing.
 */
@CommandHandler(GiveAntidoteCommand)
export class GiveAntidoteHandler implements ICommandHandler<GiveAntidoteCommand, GiveAntidoteResult> {
  constructor(
    private readonly store: CharacterHealthStore,
    private readonly stock: ItemStock,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: GiveAntidoteCommand): Promise<GiveAntidoteResult> {
    const character = await this.store.load(command.characterId, command.userId, command.roles);
    const input = command.antidote;
    character.findInjury(command.injuryId);
    if (input.source !== 'item') {
      if (!input.name) throw new ValidationError('An antidote needs a name', 'err-antidote-invalid');
      const antidote: AntidoteData = { ...input, name: input.name };
      return this.give(character, command.injuryId, antidote);
    }
    if (!input.itemId) throw new ValidationError('An item antidote needs the item', 'err-antidote-invalid');
    const item = await this.stock.load(input.itemId);
    const block = item.catalog?.features?.antidote;
    if (!block) throw new ValidationError(`Item ${item.id} is not an antidote`, 'err-item-not-antidote');
    if (!item.characterId) throw new ValidationError('The antidote must be held by a character', 'err-antidote-invalid');
    const holder = item.characterId === character.id ? character : await this.store.findCharacter(item.characterId);
    if (!holder) throw new NotFoundError('Character', item.characterId, 'err-character-not-found');
    if (holder.gameId !== character.gameId) {
      throw new ValidationError('The antidote must be of a character of the same game', 'err-antidote-invalid');
    }
    const result = await this.give(character, command.injuryId, {
      source: 'item',
      name: item.name,
      itemTypeId: item.itemTypeId,
      categories: [...block.categories],
      level: block.level,
      withinHours: block.withinHours,
    });
    await this.stock.take(item, 1);
    await this.ledger.record({
      gameId: character.gameId,
      kind: 'discard',
      itemId: item.id,
      itemTypeId: item.itemTypeId,
      itemName: item.name,
      amount: 1,
      from: { kind: 'character', id: holder.id },
      to: null,
      note: `antidote:${command.injuryId}`,
      userId: command.userId,
    });
    await this.inventorySync.refresh({ kind: 'character', id: holder.id });
    return result;
  }

  private async give(character: Character, injuryId: string, antidote: AntidoteData): Promise<GiveAntidoteResult> {
    const { neutralized } = character.giveAntidote(injuryId, antidote);
    const saved = await this.store.save(character);
    return { character: saved, injury: saved.findInjury(injuryId), neutralized };
  }
}

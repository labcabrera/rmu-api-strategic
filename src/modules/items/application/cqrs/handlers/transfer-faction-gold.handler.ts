import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { TransferGoldCommand } from '../../../../characters/application/cqrs/commands/transfer-gold.command.js';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../../characters/application/ports/character-repository.port.js';
import { Character } from '../../../../characters/domain/aggregates/character.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { GOLD_COIN } from '../../../domain/aggregates/item.js';
import { roundGold } from '../../../domain/services/price-calculator.js';
import { HolderAccess } from '../../services/holder-access.service.js';
import { InventorySync } from '../../services/inventory-sync.service.js';
import { ItemLedger } from '../../services/item-ledger.service.js';
import { Wallet } from '../../services/wallet.service.js';

/**
 * Moves gold between a character and its faction (`PATCH /characters/{id}/transfer-faction-gold`). A positive amount
 * goes from the faction to the character, which only the game master can do (workspace spec 023, decision 9); the
 * owner of the character can give its coins to the faction. Neither side can end with negative gold.
 */
@CommandHandler(TransferGoldCommand)
export class TransferFactionGoldHandler implements ICommandHandler<TransferGoldCommand, Character> {
  constructor(
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly holderAccess: HolderAccess,
    private readonly wallet: Wallet,
    private readonly ledger: ItemLedger,
    private readonly inventorySync: InventorySync,
  ) {}

  async execute(command: TransferGoldCommand): Promise<Character> {
    const amount = roundGold(command.amount);
    if (!Number.isFinite(amount) || amount === 0) throw new ValidationError('Gold amount cannot be zero', 'err-item-invalid-amount');
    const character = await this.holderAccess.load({ kind: 'character', id: command.characterId });
    const faction = this.holderAccess.factionOf(character);
    const [from, to] = amount > 0 ? [faction, character] : [character, faction];
    await this.holderAccess.checkManage(from, command.userId, command.roles);
    const gold = Math.abs(amount);

    const payments = await this.wallet.charge([{ context: from, gold }]);
    try {
      payments.push(await this.wallet.credit(to, gold));
    } catch (e) {
      await this.wallet.revert(payments);
      throw e;
    }
    await this.ledger.record({
      gameId: character.gameId,
      kind: 'gold-transfer',
      itemId: null,
      itemTypeId: GOLD_COIN,
      itemName: null,
      amount: gold,
      from: from.holder,
      to: to.holder,
      payments,
      userId: command.userId,
    });
    await this.inventorySync.refresh(character.holder);
    const updated = await this.characterRepository.findById(command.characterId);
    if (!updated) throw new NotFoundError('Character', command.characterId);
    return updated;
  }
}

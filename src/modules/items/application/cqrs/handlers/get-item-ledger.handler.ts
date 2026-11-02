import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type CharacterRepository, CHARACTER_REPOSITORY } from '../../../../characters/application/ports/character-repository.port.js';
import { GameAccess } from '../../../../games/application/services/game-access.service.js';
import { QueryCriteria } from '../../../../shared/application/criteria/query-criteria.js';
import { Page } from '../../../../shared/application/pagination/page.js';
import { ItemLedgerEntry } from '../../../domain/aggregates/item-ledger-entry.js';
import { type ItemLedgerRepository, ITEM_LEDGER_REPOSITORY } from '../../ports/item-ledger-repository.port.js';
import { GetItemLedgerQuery } from '../queries/get-item-ledger.query.js';

/**
 * The item ledger (workspace spec 023, decision 6), newest first: the entries of the games the user can read, and
 * those of their characters. Filter it by `itemId`, `holderIds` (a character or a faction), `gameId` or `kind`.
 */
@QueryHandler(GetItemLedgerQuery)
export class GetItemLedgerHandler implements IQueryHandler<GetItemLedgerQuery, Page<ItemLedgerEntry>> {
  constructor(
    @Inject(ITEM_LEDGER_REPOSITORY) private readonly repository: ItemLedgerRepository,
    @Inject(CHARACTER_REPOSITORY) private readonly characterRepository: CharacterRepository,
    private readonly gameAccess: GameAccess,
  ) {}

  async execute(query: GetItemLedgerQuery): Promise<Page<ItemLedgerEntry>> {
    const filter = GameAccess.readsAll(query.roles)
      ? QueryCriteria.empty()
      : QueryCriteria.anyOf([
          await this.gameAccess.childrenFilter(query.userId, query.roles),
          QueryCriteria.in('holderIds', await this.characterRepository.findIdsByOwner(query.userId)),
        ]);
    return this.repository.findByRsql(query.rsql, query.page, query.size, filter);
  }
}

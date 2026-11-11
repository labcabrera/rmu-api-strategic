import { parse } from '@rsql/parser';
import { InvalidSearchExpression, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { CatalogPagedQueryDto } from '../../../../shared/interfaces/http/dto/paged-rsql-query.js';

type RsqlNode = ReturnType<typeof parse>;

/**
 * The listing of a chronicle: `q` must hold `gameId==<id>`, alone or joined with `;` to other conditions. The page
 * goes up to 1000 (catalog size), so a whole chronicle of 200 chapters loads in one call.
 */
export class ChronicleChapterQueryDto extends CatalogPagedQueryDto {
  static gameIdOf(q: string | undefined): string {
    if (q && q.trim() !== '') {
      let node: RsqlNode;
      try {
        node = parse(q);
      } catch (error) {
        throw new InvalidSearchExpression(`Invalid RSQL query: ${q}. ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      const gameId = findGameId(node);
      if (gameId) return gameId;
    }
    throw new ValidationError('The chronicle is listed by game: q=gameId==<id>');
  }
}

/** The value of a `gameId==` comparison that every result must meet (a top-level conjunct). */
function findGameId(node: RsqlNode): string | undefined {
  if (node.type === 'COMPARISON') {
    const value = node.right.value;
    return node.left.selector === 'gameId' && node.operator === '==' && typeof value === 'string' && value !== '' ? value : undefined;
  }
  if (node.operator !== ';') return undefined;
  return findGameId(node.left) ?? findGameId(node.right);
}

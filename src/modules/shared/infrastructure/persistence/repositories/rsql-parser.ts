/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { parse } from '@rsql/parser';
import { InvalidSearchExpression } from 'src/modules/shared/domain/errors/errors';

type MongoQuery = Record<string, any>;

@Injectable()
export class RsqlParser {
  private readonly logger = new Logger(RsqlParser.name);

  public parse(rsql: string): MongoQuery {
    if (!rsql || rsql.trim() === '') {
      return {};
    }
    this.logger.verbose(`Converting RSQL to MongoDB query: ${rsql}`);
    try {
      const node: any = parse(rsql);
      const result = this.processNode(node);
      this.logger.verbose(`Converted MongoDB query: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      throw new InvalidSearchExpression(`Invalid RSQL query: ${rsql}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processNode(node: any): MongoQuery {
    switch (node.type) {
      case 'LOGIC':
        if (node.operator === ';') {
          if (!node.left || !node.right) {
            throw new InvalidSearchExpression('AND operator requires two operands');
          }
          return { $and: [this.processNode(node.left), this.processNode(node.right)] };
        } else if (node.operator === ',') {
          if (!node.left || !node.right) {
            throw new InvalidSearchExpression('OR operator requires two operands');
          }
          return { $or: [this.processNode(node.left), this.processNode(node.right)] };
        } else {
          throw new InvalidSearchExpression(`Unsupported logic operator: ${node.operator}`);
        }
      case 'AND':
        if (!node.args || node.args.length === 0) {
          throw new InvalidSearchExpression('AND operator requires at least one argument');
        }
        return { $and: node.args.map(this.processNode) };
      case 'OR':
        if (!node.args || node.args.length === 0) {
          throw new InvalidSearchExpression('OR operator requires at least one argument');
        }
        return { $or: node.args.map(this.processNode) };
      case 'COMPARISON': {
        let field = node.left?.selector || node.selector;
        if (field === 'id') field = '_id';
        const op = node.operator || node.comparison;
        const value = node.right?.value || (node.arguments ? node.arguments[0] : undefined);
        if (!field) throw new InvalidSearchExpression(`Missing field selector in comparison`);
        if (!op) throw new InvalidSearchExpression(`Missing operator in comparison for field ${field}`);
        if (value === undefined) throw new InvalidSearchExpression(`Missing value for comparison operator ${op} on field ${field}`);

        // Normalizer: convert literal 'null' (case-insensitive) to JS null.
        const normalize = (v: any) => {
          if (v === null) return null;
          if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return null;
          return v;
        };

        // Handle arrays vs single value and coerce numbers only when value !== null
        const coerce = (v: any) => {
          const n = normalize(v);
          if (n === null) return null;
          if (typeof n === 'string' && !isNaN(Number(n)) && n.trim() !== '') {
            const num = Number(n);
            return Number.isFinite(num) ? num : n;
          }
          return n;
        };

        const processedValue = coerce(value);

        switch (op) {
          case '==':
            // Match null OR missing when value is null
            if (processedValue === null) return { [field]: null };
            return { [field]: processedValue };
          case '!=':
            // For null, require field exists and is not null (inverse of == null)
            if (processedValue === null) return { [field]: { $ne: null, $exists: true } };
            return { [field]: { $ne: processedValue } };
          case '>':
            return { [field]: { $gt: processedValue } };
          case '>=':
            return { [field]: { $gte: processedValue } };
          case '<':
            return { [field]: { $lt: processedValue } };
          case '<=':
            return { [field]: { $lte: processedValue } };
          case '=in=': {
            const values = Array.isArray(value) ? value : [value];
            const inValues = values.map(coerce);
            return { [field]: { $in: inValues } };
          }
          case '=out=': {
            const values = Array.isArray(value) ? value : [value];
            const outValues = values.map(coerce);
            return { [field]: { $nin: outValues } };
          }
          case '=re=':
            if (processedValue === null) {
              throw new InvalidSearchExpression('Regex operator cannot be applied to null');
            }
            return { [field]: { $regex: processedValue, $options: 'i' } };
          default:
            throw new Error(`Unsupported operator: ${op}`);
        }
      }
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }
}

import type { QueryFilter } from 'mongoose';
import { QueryCriteria, type SortCriteria } from '../../application/criteria/query-criteria.js';

type MongoSort = Record<string, 1 | -1>;

export class MongoQueryCriteriaMapper {
  static toFilterQuery(criteria?: QueryCriteria): QueryFilter<any> {
    if (!criteria || criteria.type === 'empty') return {};

    switch (criteria.type) {
      case 'eq':
        return { [criteria.field]: criteria.value };
      case 'anyOf':
        return { $or: criteria.criteria.map(item => this.toFilterQuery(item)) };
      case 'allOf':
        return { $and: criteria.criteria.map(item => this.toFilterQuery(item)) };
    }
  }

  static toSort(sort?: SortCriteria): MongoSort {
    if (!sort || Object.keys(sort).length === 0) return { _id: 1 };

    return Object.entries(sort).reduce<MongoSort>((mongoSort, [field, direction]) => {
      mongoSort[field] = direction === 'asc' ? 1 : -1;
      return mongoSort;
    }, {});
  }
}

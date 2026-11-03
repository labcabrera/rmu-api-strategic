export type CriteriaValue = string | number | boolean | null;

export type QueryCriteria =
  | { type: 'empty' }
  | { type: 'eq'; field: string; value: CriteriaValue }
  | { type: 'in'; field: string; values: CriteriaValue[] }
  | { type: 'anyOf'; criteria: QueryCriteria[] }
  | { type: 'allOf'; criteria: QueryCriteria[] }
  /** An element of the array `field` with all these values (spec 071: a member with a role). */
  | { type: 'elemMatch'; field: string; values: Record<string, CriteriaValue> };

export type SortDirection = 'asc' | 'desc';

export type SortCriteria = Record<string, SortDirection>;

export const QueryCriteria = {
  empty: (): QueryCriteria => ({ type: 'empty' }),
  eq: (field: string, value: CriteriaValue): QueryCriteria => ({ type: 'eq', field, value }),
  in: (field: string, values: CriteriaValue[]): QueryCriteria => ({ type: 'in', field, values }),
  anyOf: (criteria: QueryCriteria[]): QueryCriteria => ({ type: 'anyOf', criteria }),
  allOf: (criteria: QueryCriteria[]): QueryCriteria => ({ type: 'allOf', criteria }),
  elemMatch: (field: string, values: Record<string, CriteriaValue>): QueryCriteria => ({ type: 'elemMatch', field, values }),
};

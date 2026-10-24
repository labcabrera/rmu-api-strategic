export type CriteriaValue = string | number | boolean | null;

export type QueryCriteria =
  | { type: 'empty' }
  | { type: 'eq'; field: string; value: CriteriaValue }
  | { type: 'in'; field: string; values: CriteriaValue[] }
  | { type: 'anyOf'; criteria: QueryCriteria[] }
  | { type: 'allOf'; criteria: QueryCriteria[] };

export type SortDirection = 'asc' | 'desc';

export type SortCriteria = Record<string, SortDirection>;

export const QueryCriteria = {
  empty: (): QueryCriteria => ({ type: 'empty' }),
  eq: (field: string, value: CriteriaValue): QueryCriteria => ({ type: 'eq', field, value }),
  in: (field: string, values: CriteriaValue[]): QueryCriteria => ({ type: 'in', field, values }),
  anyOf: (criteria: QueryCriteria[]): QueryCriteria => ({ type: 'anyOf', criteria }),
  allOf: (criteria: QueryCriteria[]): QueryCriteria => ({ type: 'allOf', criteria }),
};

// Represents a data attribute in SigNoz, which can be a tag, resource, etc.
export interface Attribute {
  key: string;
  dataType: 'string' | 'int64' | 'float64' | 'bool' | string;
  type: 'tag' | 'resource' | 'span' | 'log' | 'timestamp' | 'attribute' | '';
  isColumn?: boolean;
}

// Defines a single condition for filtering data (e.g., 'service.name = my-service').
export interface FilterItem {
  key: Attribute;
  op:
    | '=' | '!=' | '>' | '>=' | '<' | '<='
    | 'in' | 'nin' | 'contains' | 'ncontains'
    | 'regex' | 'nregex' | 'like' | 'nlike'
    | 'exists' | 'nexists';
  value: string | number | boolean | string[] | number[];
}

// A collection of filter items, combined with either an AND or OR operator.
export interface Filter {
  items: FilterItem[];
  op: 'AND' | 'OR';
}

// Defines the sorting order for a query result.
export interface OrderBy {
  columnName: string;
  order: 'asc' | 'desc';
}

// Represents the structure of a query built using the SigNoz query builder.
export interface BuilderQuery {
  dataSource: 'traces' | 'metrics' | 'logs';
  queryName: string;
  expression: string;
  disabled: boolean;
  aggregateOperator:
    | 'noop' | 'count' | 'count_distinct' | 'sum' | 'avg' | 'min' | 'max'
    | 'p05' | 'p10' | 'p20' | 'p25' | 'p50' | 'p75' | 'p90' | 'p95' | 'p99'
    | 'rate' | 'rate_sum' | 'rate_avg' | 'rate_min' | 'rate_max';
  aggregateAttribute?: Attribute | {};
  groupBy?: Attribute[];
  orderBy?: OrderBy[];
  filters?: Filter;
  stepInterval: number;
  limit?: number | null;
  offset?: number;
  pageSize?: number;
  having?: any[];
  selectColumns?: Attribute[];
  reduceTo?: string;
}

// A composite query that encapsulates one or more builder queries for a specific panel type.
export interface CompositeQuery {
  queryType: 'builder';
  panelType: 'list' | 'graph' | 'table' | 'trace' | 'value';
  builderQueries: { [key: string]: BuilderQuery };
}

// The final payload structure for a SigNoz API query_range request.
export interface SigNozApiPayload {
  start: number;
  end: number;
  step: number;
  compositeQuery: CompositeQuery;
}

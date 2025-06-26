import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { USER_AGENT } from './constants.js';
import type { Attribute, BuilderQuery, FilterItem, SigNozApiPayload } from './types.js';

/**
 * Creates an Attribute object.
 * @param key - The attribute key (e.g., 'service.name').
 * @param dataType - The data type of the attribute.
 * @param type - The category of the attribute (e.g., 'resource', 'tag').
 * @param isColumn - Whether the attribute is a column.
 * @returns An Attribute object.
 */
export function createAttribute(key: string, dataType: Attribute['dataType'], type: Attribute['type'], isColumn: boolean = false): Attribute {
  return { key, dataType, type, isColumn };
}

/**
 * Creates a FilterItem object for use in queries.
 * @param key - The attribute key to filter on.
 * @param dataType - The data type of the attribute.
 * @param type - The category of the attribute.
 * @param op - The comparison operator.
 * @param value - The value to compare against.
 * @param isColumn - Whether the attribute is a column.
 * @returns A FilterItem object.
 */
export function createFilterItem(key: string, dataType: Attribute['dataType'], type: Attribute['type'], op: FilterItem['op'], value: FilterItem['value'], isColumn: boolean = false): FilterItem {
    return { key: createAttribute(key, dataType, type, isColumn), op, value };
}

/**
 * Infers the attribute type ('resource' or 'tag') based on a predefined list of keys.
 * @param key - The attribute key.
 * @returns The inferred attribute type.
 */
export function inferAttributeType(key: string): Attribute['type'] {
    const resourceKeys = ['service.name', 'k8s.deployment.name', 'deployment_name', 'serviceName'];
    if (resourceKeys.includes(key) || key.startsWith('k8s.')) return 'resource';
    return 'tag';
}

/**
 * Creates a base BuilderQuery object with sensible defaults.
 * @param dataSource - The data source ('logs' or 'traces').
 * @param options - Overrides for the default query properties.
 * @returns A BuilderQuery object.
 */
export function createBaseBuilderQuery(dataSource: BuilderQuery['dataSource'], options: Partial<BuilderQuery>): BuilderQuery {
  return {
    dataSource,
    queryName: "A",
    expression: "A",
    disabled: false,
    aggregateOperator: "noop",
    groupBy: [],
    orderBy: [{ columnName: "timestamp", order: "desc" }],
    filters: { items: [], op: "AND" },
    stepInterval: 60,
    offset: 0,
    selectColumns: [],
    having: [],
    reduceTo: "sum",
    ...options,
  };
}

/**
 * Sends a query to the SigNoz API.
 * @param payload - The SigNozApiPayload object.
 * @returns The data from the API response.
 * @throws An error if the API call fails.
 */
export async function querySigNozApi(payload: SigNozApiPayload): Promise<any> {
  const baseUrl = process.env.SIGNOZ_API_BASE_URL!;
  const apiKey = process.env.SIGNOZ_API_KEY!;
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v4/query_range`;

  try {
    const response: AxiosResponse = await axios.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json', 'SIGNOZ-API-KEY': apiKey, 'User-Agent': USER_AGENT },
      timeout: 20000,
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message;
      if (status === 401 || status === 403) console.error(`Authentication Error (${status}): Check SIGNOZ_API_KEY.`);
      throw new Error(`API call failed with status ${status || 'N/A'}: ${errorMsg}`);
    }
    throw new Error(`An unexpected error occurred: ${String(error)}`);
  }
}

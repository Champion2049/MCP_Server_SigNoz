import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    createAttribute,
    createBaseBuilderQuery,
    createFilterItem,
    inferAttributeType,
    querySigNozApi
} from '../signoz-api.js';
import type { Attribute, FilterItem, SigNozApiPayload } from "../types.js";

/**
 * Registers the aggregate-traces tool with the MCP server.
 * @param server - The McpServer instance.
 */
export function registerAggregateTracesTool(server: McpServer) {
    server.tool(
        "aggregate-traces",
        "Calculates aggregate metrics from trace data. Use this for charts and tables about trace performance.",
        {
            aggregationFunction: z.enum(["count", "count_distinct", "sum", "avg", "min", "max", "p50", "p90", "p99", "rate"]).describe("The calculation to perform."),
            startTimeUnix: z.number().int().optional().describe("Start of time range in Unix seconds. Defaults to 1 hour ago."),
            endTimeUnix: z.number().int().optional().describe("End of time range in Unix seconds. Defaults to now."),
            groupBy: z.array(z.string()).optional().describe("Fields to group by (e.g., to get a count per service, use ['serviceName'])."),
            aggregateField: z.string().optional().describe("The numeric field to perform the calculation on (e.g., 'durationNano'). Required for sum, avg, etc."),
            serviceName: z.string().optional().describe("Filter traces to a specific service before aggregating."),
            hasError: z.boolean().optional().describe("Filter traces that have an error."),
        },
        async ({ startTimeUnix, endTimeUnix, aggregationFunction, groupBy, aggregateField, serviceName, hasError }) => {
            const now = Date.now();
            const startMs = (startTimeUnix ? startTimeUnix * 1000 : now - 60 * 60 * 1000);
            const endMs = (endTimeUnix ? endTimeUnix * 1000 : now);

            if (aggregationFunction !== 'count' && !aggregateField) {
                return { content: [{ type: "text", text: `Error: 'aggregateField' is required for '${aggregationFunction}'.` }] };
            }

            const filters: FilterItem[] = [];
            if (serviceName) filters.push(createFilterItem("serviceName", "string", "tag", "=", serviceName, true));
            if (hasError !== undefined) filters.push(createFilterItem("hasError", "bool", "tag", "=", hasError, true));

            const groupByAttributes = (groupBy || []).map(field => createAttribute(field, 'string', inferAttributeType(field), true));

            let aggregateAttribute: Attribute | {} | undefined;
            if (aggregateField) aggregateAttribute = createAttribute(aggregateField, "string", "tag");
            else if (aggregationFunction === 'count') aggregateAttribute = {};

            const builderQuery = createBaseBuilderQuery("traces", {
                aggregateOperator: aggregationFunction,
                aggregateAttribute,
                groupBy: groupByAttributes,
                filters: { items: filters, op: "AND" },
                stepInterval: 0,
                reduceTo: aggregationFunction,
            });

            const payload: SigNozApiPayload = {
                start: startMs, end: endMs, step: 0,
                compositeQuery: { queryType: "builder", panelType: 'table', builderQueries: { A: builderQuery } },
            };

            try {
                const responseData = await querySigNozApi(payload);
                const resultData = responseData?.data?.result?.[0];

                if (!resultData || !resultData.table || resultData.table.rows.length === 0) {
                    return { content: [{ type: "text", text: "No aggregation results found." }] };
                }

                const { rows, headers } = resultData.table;
                const formatted = rows.map((row: any[]) => headers.map((header: string, i: number) => `${header}: ${row[i]}`).join(", ")).join("\n");
                return { content: [{ type: "text", text: `Aggregated traces (table):\n\n${formatted}` }] };
            } catch (error) {
                return { content: [{ type: "text", text: `Error aggregating traces: ${String(error)}` }] };
            }
        },
    );
}

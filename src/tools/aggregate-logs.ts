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
 * Registers the aggregate-logs tool with the MCP server.
 * @param server - The McpServer instance.
 */
export function registerAggregateLogsTool(server: McpServer) {
    server.tool(
        "aggregate-logs",
        "Calculates aggregate metrics from log data, such as counts or averages. This is the primary tool for generating data for charts and tables.",
        {
            aggregationFunction: z.enum(["count", "count_distinct", "sum", "avg", "min", "max", "p50", "p90", "p99", "rate"]).describe("The calculation to perform."),
            panelType: z.enum(['table', 'graph', 'value']).describe("The desired output format. Use 'table' for categorical breakdowns (with `groupBy`), 'graph' for time-series data (with `stepInterval`), or 'value' for a single number."),
            startTimeUnix: z.number().int().optional().describe("Start of time range in Unix seconds. If not provided, the tool will auto-detect the time of the most recent logs."),
            endTimeUnix: z.number().int().optional().describe("End of time range in Unix seconds. If not provided, the tool will auto-detect the time of the most recent logs."),
            groupBy: z.array(z.string()).optional().describe("For 'table' panelType, fields to group by (e.g., to get a count per service, use ['service.name'])."),
            aggregateField: z.string().optional().describe("The numeric field to perform the calculation on (required for sum, avg, etc.)."),
            serviceName: z.string().optional().describe("Filter logs to a specific service before aggregating."),
            stepInterval: z.number().int().positive().optional().default(60).describe("For 'graph' panelType, the time bucket size in seconds (e.g., 60 for 1-minute intervals)."),
        },
        async (params) => {
            const { aggregationFunction, groupBy, aggregateField, serviceName, panelType, stepInterval } = params;
            let { startTimeUnix, endTimeUnix } = params;

            if (!startTimeUnix || !endTimeUnix) {
                console.error("No time range provided. Auto-detecting latest log time...");
                const searchPayload: SigNozApiPayload = {
                    start: 0, end: Date.now(), step: 0,
                    compositeQuery: { queryType: "builder", panelType: "list", builderQueries: { A: createBaseBuilderQuery("logs", { pageSize: 1, aggregateOperator: 'noop'}) } }
                };
                try {
                    const latestLogResponse = await querySigNozApi(searchPayload);
                    const latestLog = latestLogResponse?.data?.result?.[0]?.list?.[0];
                    if (latestLog) {
                        const latestTimestampMs = new Date(latestLog.timestamp).getTime();
                        endTimeUnix = Math.floor(latestTimestampMs / 1000);
                        startTimeUnix = endTimeUnix - 3600; // Default to a 1-hour window around the latest log
                        console.error(`Auto-detected time range: ${new Date(startTimeUnix * 1000).toISOString()} to ${new Date(endTimeUnix * 1000).toISOString()}`);
                    } else {
                        const now = Date.now();
                        endTimeUnix = Math.floor(now / 1000);
                        startTimeUnix = endTimeUnix - 3600;
                    }
                } catch (e) {
                    console.error("Failed to auto-detect time, defaulting to last hour.", e);
                    const now = Date.now();
                    endTimeUnix = Math.floor(now / 1000);
                    startTimeUnix = endTimeUnix - 3600;
                }
            }

            const startMs = startTimeUnix * 1000;
            const endMs = endTimeUnix * 1000;

            if (aggregationFunction !== 'count' && !aggregateField) {
                return { content: [{ type: "text", text: `Error: 'aggregateField' is required for '${aggregationFunction}'.` }] };
            }

            const filters: FilterItem[] = [];
            if (serviceName) filters.push(createFilterItem("service.name", "string", "resource", "=", serviceName, true));

            const groupByAttributes = (groupBy || []).map(field => createAttribute(field, 'string', inferAttributeType(field), true));

            let aggregateAttribute: Attribute | {} | undefined;
            if (aggregateField) aggregateAttribute = createAttribute(aggregateField, "string", "tag");
            else if (aggregationFunction === 'count') aggregateAttribute = {};

            const finalStepInterval = (panelType === 'graph' || panelType === 'value') ? stepInterval : 0;

            const builderQuery = createBaseBuilderQuery("logs", {
                aggregateOperator: aggregationFunction,
                aggregateAttribute,
                groupBy: groupByAttributes,
                filters: { items: filters, op: "AND" },
                stepInterval: finalStepInterval,
                reduceTo: aggregationFunction,
            });

            const payload: SigNozApiPayload = {
                start: startMs, end: endMs, step: finalStepInterval || 0,
                compositeQuery: { queryType: "builder", panelType, builderQueries: { A: builderQuery } },
            };

            try {
                const responseData = await querySigNozApi(payload);
                const resultData = responseData?.data?.result?.[0];

                if (!resultData) return { content: [{ type: "text", text: "No data returned from API." }] };

                if (resultData.series) {
                    if (resultData.series.length === 0) return { content: [{ type: "text", text: "No results found." }] };
                    const formatted = resultData.series.flatMap((s: any) => {
                        const labels = Object.entries(s.labels || {}).map(([k, v]) => `${k}=${v}`).join(', ');
                        return s.values.map((point: { timestamp: number, value: string }) => {
                            const ts = new Date(point.timestamp).toISOString();
                            if (panelType === 'value') return `Value: ${point.value} ${labels ? `(${labels})` : ''}`.trim();
                            return `[${ts}] ${labels ? `(${labels})` : ''} -> Value: ${point.value}`;
                        });
                    }).join("\n");
                    return { content: [{ type: "text", text: `Aggregated logs (${panelType}):\n\n${formatted}` }] };
                } else if (resultData.table) {
                    if (resultData.table.rows.length === 0) return { content: [{ type: "text", text: "No results found." }] };
                    const formatted = resultData.table.rows.map((row: any[]) => resultData.table.headers.map((header: string, i: number) => `${header}: ${row[i]}`).join(", ")).join("\n");
                    return { content: [{ type: "text", text: `Aggregated logs (table):\n\n${formatted}` }] };
                } else {
                    return { content: [{ type: "text", text: `Unexpected data structure for panel type '${panelType}'.` }] };
                }
            } catch (error) {
                return { content: [{ type: "text", text: `Error aggregating logs: ${String(error)}` }] };
            }
        },
    );
}

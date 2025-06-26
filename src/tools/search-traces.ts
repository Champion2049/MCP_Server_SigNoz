import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    createBaseBuilderQuery,
    createFilterItem,
    querySigNozApi
} from '../signoz-api.js';
import type { FilterItem, SigNozApiPayload } from "../types.js";

/**
 * Registers the search-traces tool with the MCP server.
 * @param server - The McpServer instance.
 */
export function registerSearchTracesTool(server: McpServer) {
    server.tool(
        "search-traces",
        "Fetches a list of raw trace spans. Use this to find specific examples of traces, not for summarized data or charts.",
        {
            startTimeUnix: z.number().int().optional().describe("Start of time range in Unix seconds. Defaults to 30 mins ago."),
            endTimeUnix: z.number().int().optional().describe("End of time range in Unix seconds. Defaults to now."),
            pageSize: z.number().int().positive().optional().default(20).describe("Number of traces to return."),
            limit: z.number().int().positive().optional().default(1000).describe("Total pagination limit."),
            serviceName: z.string().optional().describe("Filter by a specific service name."),
            hasError: z.boolean().optional().describe("Filter for traces that have an error."),
        },
        async ({ startTimeUnix, endTimeUnix, pageSize, limit, serviceName, hasError }) => {
            const now = Date.now();
            const startMs = (startTimeUnix ? startTimeUnix * 1000 : now - 30 * 60 * 1000);
            const endMs = (endTimeUnix ? endTimeUnix * 1000 : now);

            const filters: FilterItem[] = [];
            if (serviceName) filters.push(createFilterItem("serviceName", "string", "tag", "=", serviceName, true));
            if (hasError !== undefined) filters.push(createFilterItem("hasError", "bool", "tag", "=", hasError, true));

            const builderQuery = createBaseBuilderQuery("traces", {
                pageSize, limit, filters: { items: filters, op: "AND" }, stepInterval: 0, aggregateOperator: 'noop',
            });
            const payload: SigNozApiPayload = {
                start: startMs, end: endMs, step: 0,
                compositeQuery: { queryType: "builder", panelType: "list", builderQueries: { A: builderQuery } },
            };

            try {
                const response = await querySigNozApi(payload);
                const traces = response?.data?.result?.[0]?.list || [];
                if (traces.length === 0) return { content: [{ type: "text", text: "No traces found." }] };

                const formatted = traces.map((trace: any) => {
                    const { traceID, spanID, name, serviceName, durationNano } = trace.data;
                    const durationMs = (durationNano / 1_000_000).toFixed(2);
                    return `TraceID: ${traceID}, SpanID: ${spanID}, Service: ${serviceName}, Name: ${name}, Duration: ${durationMs}ms`;
                }).join("\n");
                return { content: [{ type: "text", text: `Found ${traces.length} traces:\n\n${formatted}` }] };
            } catch (error) {
                return { content: [{ type: "text", text: `Error searching traces: ${String(error)}` }] };
            }
        },
    );
}

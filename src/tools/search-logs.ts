import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    createBaseBuilderQuery,
    createFilterItem,
    querySigNozApi
} from '../signoz-api.js';
import type { FilterItem, SigNozApiPayload } from "../types.js";

/**
 * Registers the search-logs tool with the MCP server.
 * @param server - The McpServer instance.
 */
export function registerSearchLogsTool(server: McpServer) {
    server.tool(
        "search-logs",
        "Fetches a list of raw log entries. Use this when you need to see specific log examples, not for summarized data or charts.",
        {
            query: z.string().optional().describe("Keywords to search for in the log body."),
            startTimeUnix: z.number().int().optional().describe("Start of time range in Unix seconds. Defaults to 30 mins ago."),
            endTimeUnix: z.number().int().optional().describe("End of time range in Unix seconds. Defaults to now."),
            pageSize: z.number().int().positive().optional().default(20).describe("Number of logs to return."),
            limit: z.number().int().positive().optional().default(1000).describe("Total pagination limit."),
            serviceName: z.string().optional().describe("Filter by a specific service name."),
        },
        async ({ query, startTimeUnix, endTimeUnix, pageSize, limit, serviceName }) => {
            const now = Date.now();
            const startMs = (startTimeUnix ? startTimeUnix * 1000 : now - 30 * 60 * 1000);
            const endMs = (endTimeUnix ? endTimeUnix * 1000 : now);
            const filters: FilterItem[] = [];
            if (serviceName) filters.push(createFilterItem("service.name", "string", "resource", "=", serviceName, true));
            if (query) filters.push(createFilterItem("body", "string", "log", "contains", query));

            const builderQuery = createBaseBuilderQuery("logs", {
                pageSize, limit, filters: { items: filters, op: "AND" }, stepInterval: 0, aggregateOperator: 'noop',
            });
            const payload: SigNozApiPayload = {
                start: startMs, end: endMs, step: 0,
                compositeQuery: { queryType: "builder", panelType: "list", builderQueries: { A: builderQuery } },
            };
            try {
                const response = await querySigNozApi(payload);
                const logs = response?.data?.result?.[0]?.list || [];
                if (logs.length === 0) return { content: [{ type: "text", text: "No logs found." }] };
                const formatted = logs.map((log: any) => {
                    const ts = new Date(log.timestamp).toISOString();
                    const service = log.data.resources_string?.['service.name'] || 'unknown';
                    const level = log.data.severity_text ? `[${log.data.severity_text}]` : '';
                    return `[${ts}] [${service}] ${level} ${log.data.body}`;
                }).join("\n");
                return { content: [{ type: "text", text: `Found ${logs.length} logs:\n\n${formatted}` }] };
            } catch (error) {
                return { content: [{ type: "text", text: `Error searching logs: ${String(error)}` }] };
            }
        },
    );
}

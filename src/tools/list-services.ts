import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    createAttribute,
    createBaseBuilderQuery,
    querySigNozApi
} from '../signoz-api.js';
import type { SigNozApiPayload } from "../types.js";

/**
 * Registers the list-services tool with the MCP server.
 * This tool fetches a list of all unique service names that have sent traces.
 * @param server - The McpServer instance.
 */
export function registerListServicesTool(server: McpServer) {
    server.tool(
        "list-services",
        "Fetches a list of all unique service names that have sent logs or traces.",
        // For tools with no parameters, pass a plain empty object for the schema.
        {},
        async () => {
            const now = Date.now();
            // Query the last 24 hours to find all active services.
            const startMs = now - 24 * 60 * 60 * 1000;
            const endMs = now;

            const builderQuery = createBaseBuilderQuery("traces", {
                aggregateOperator: 'count',
                groupBy: [createAttribute("serviceName", "string", "tag", true)],
                stepInterval: 0,
                limit: 1000,
                orderBy: [], // Order is not important for just listing names
            });

            const payload: SigNozApiPayload = {
                start: startMs,
                end: endMs,
                step: 0,
                compositeQuery: { queryType: "builder", panelType: 'table', builderQueries: { A: builderQuery } },
            };

            try {
                const responseData = await querySigNozApi(payload);
                const resultData = responseData?.data?.result?.[0];

                if (!resultData || !resultData.table || resultData.table.rows.length === 0) {
                    return { content: [{ type: "text", text: "No services found." }] };
                }

                const { rows, headers } = resultData.table;
                const serviceNameIndex = headers.findIndex((h: string) => h === 'serviceName');

                if (serviceNameIndex === -1) {
                    return { content: [{ type: "text", text: "Could not find 'serviceName' column in the result." }] };
                }

                const services = rows.map((row: any[]) => row[serviceNameIndex]).filter(Boolean);

                if (services.length === 0) {
                    return { content: [{ type: "text", text: "No services found." }] };
                }

                return { content: [{ type: "text", text: `Found the following services:\n\n- ${services.join('\n- ')}` }] };
            } catch (error) {
                return { content: [{ type: "text", text: `Error fetching services: ${String(error)}` }] };
            }
        }
    );
}

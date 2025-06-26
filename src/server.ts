import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchLogsTool } from "./tools/search-logs.js";
import { registerAggregateLogsTool } from "./tools/aggregate-logs.js";
import { registerSearchTracesTool } from "./tools/search-traces.js";
import { registerAggregateTracesTool } from "./tools/aggregate-traces.js";

/**
 * This MCP server acts as an intelligent client for the SigNoz Observability Platform API.
 * Its purpose is to translate natural language requests about logs and traces into valid SigNoz API queries.
 */
const server = new McpServer({
  name: "signoz",
  version: "3.3.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register all tools with the server instance
registerSearchLogsTool(server);
registerAggregateLogsTool(server);
registerSearchTracesTool(server);
registerAggregateTracesTool(server);

// Starts the MCP server and connects it to the specified transport.
export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SigNoz MCP Server is running and connected via stdio.");
}

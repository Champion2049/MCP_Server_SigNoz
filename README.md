# SigNoz MCP Server

An intelligent Model-Context-Protocol (MCP) server that acts as a natural language client for the SigNoz Observability Platform API. This server translates human-like questions about logs and traces into valid SigNoz API queries, making it easier to interact with your observability data.

## Features

* **Natural Language Queries**: Ask for logs, traces, and metrics in plain English.
* **Log & Trace Analysis**:
    * Search for raw logs and trace spans with keyword and attribute filtering.
    * Perform powerful aggregations (count, sum, average, percentiles) on logs and traces.
* **Context-Aware Sessions**: Set a default service name and time range to simplify subsequent queries.
* **Service Discovery**: Automatically list all available services sending data to SigNoz.
* **Extensible Toolset**: Built with a modular tool architecture, making it easy to add new capabilities.
* **TypeScript & Zod**: Strongly typed for robust and maintainable code.

## Getting Started

Follow these instructions to get the server up and running on your local machine.

### Prerequisites

* Node.js (v18 or later recommended)
* npm (usually comes with Node.js)
* A running SigNoz instance (Cloud or self-hosted)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Champion2049/MCP_Server_SigNoz.git
    cd <repository-directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

The server requires API credentials to connect to your SigNoz instance.

1.  Create a `.env` file in the root directory of the project.
2.  Add the following environment variables to the `.env` file:

    ```env
    # The base URL of your SigNoz API endpoint
    # For SigNoz Cloud, find this in Settings -> Ingestion Settings
    # Example: [https://us.signoz.cloud](https://us.signoz.cloud)
    SIGNOZ_API_BASE_URL="<YOUR_SIGNOZ_BASE_URL>"

    # Your SigNoz API Key
    # Generate this from Settings -> API Keys in your SigNoz instance
    SIGNOZ_API_KEY="<YOUR_SIGNOZ_API_KEY>"
    ```
    Replace the placeholder values with your actual SigNoz URL and API key.

### Usage

Once configured, you can build and run the server.

1.  Build the TypeScript source:
    ```bash
    npm run build
    ```
2.  Run the server:
    ```bash
    npm start
    ```
    You should see a message indicating that the server is running:
    ```
    SigNoz MCP Server is running and connected via stdio.
    ```
    The server now listens for MCP requests over stdio.

### MCP Client Configuration

To connect this server to an MCP client (like a chatbot or another application), you'll need to configure the client to launch the server. Create a config file for the MCP client, here is an example configuration:

```json
{
  "mcpServers": {
    "SigNoz": {
      "command": "node",
      "args": ["/path/to/your/project/build/index.js"]
    }
  }
}
```
**Note**: Ensure the `command` and `args` point to the correct location of your compiled `index.js` file.

## Example Prompts

Here are some examples of what you can ask the server.

* **Set a context for your session:**
    * `"Set the default service to 'frontend' and the time range to the last 90 minutes."`

* **Search for specific logs:**
    * `"Show me the latest logs from the 'api-gateway' service that contain the word 'error'."`
    * `"Find logs for the 'payment-service' in the last 30 minutes."`

* **Aggregate log data:**
    * `"Count the number of logs per service over the last hour."`
    * `"Show me a graph of error logs per minute for the 'frontend' service."`

* **Find and analyze traces:**
    * `"Find traces for the 'checkout-service' that have an error."`
    * `"Show me the slowest traces from the 'user-service' in the last day."`

* **Calculate performance metrics:**
    * `"What is the P99 latency for the 'api-gateway' service?"` (This will use `aggregate-traces` with `durationNano`)
    * `"Calculate the average duration of traces for the 'data-processor' service grouped by operation name."`

* **Discover services:**
    * `"List all available services."`

## Tools Overview

The server exposes several tools to interact with the SigNoz API.

| Tool Name          | Description                                                                                              | Parameters                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `search-logs`      | Fetches a list of raw log entries based on filters.                                                      | `query`, `serviceName`, `startTimeUnix`, `endTimeUnix`, `pageSize`, `limit`            |
| `aggregate-logs`   | Calculates aggregate metrics (e.g., count, avg) from log data. Ideal for creating charts and tables.     | `aggregationFunction`, `panelType`, `groupBy`, `aggregateField`, `serviceName`, `startTimeUnix`, `endTimeUnix`, `stepInterval` |
| `search-traces`    | Fetches a list of raw trace spans based on filters.                                                      | `serviceName`, `hasError`, `startTimeUnix`, `endTimeUnix`, `pageSize`, `limit`         |
| `aggregate-traces` | Calculates aggregate metrics from trace data (e.g., P99 latency).                                        | `aggregationFunction`, `groupBy`, `aggregateField`, `serviceName`, `hasError`, `startTimeUnix`, `endTimeUnix` |
| `list-services`    | Fetches a list of all unique service names that have sent data.                                          | None                                                                                   |

## Project Structure

The codebase is organized into logical modules to promote separation of concerns and maintainability.

```
src/
├── tools/                # Contains individual tool definitions
│   ├── aggregate-logs.ts
│   ├── aggregate-traces.ts
│   ├── list-services.ts
│   ├── search-logs.ts
│   ├── search-traces.ts
├── constants.ts          # Global constants (e.g., User-Agent)
├── index.ts              # Main application entry point (loads .env, starts server)
├── server.ts             # MCP server setup and tool registration
├── signoz-api.ts         # Helper functions for querying the SigNoz API
└── types.ts              # Core TypeScript interfaces and types
```

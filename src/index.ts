import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import { startServer } from "./server.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Looks for a .env file in the parent directory (project root)
const pathToDotEnv = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: pathToDotEnv });

async function main() {
  // Validate that necessary environment variables are loaded
  if (!process.env.SIGNOZ_API_BASE_URL || !process.env.SIGNOZ_API_KEY) {
    console.error("\nFATAL ERROR: SIGNOZ_API_BASE_URL and/or SIGNOZ_API_KEY are not set.");
    console.error(`Attempted to load .env from: ${pathToDotEnv}`);
    console.error("Please ensure a .env file exists in the project root with the required variables.");
    process.exit(1);
  }
  // Starts the server
  await startServer();
}

// Execute the main function and handle any fatal errors
main().catch((error) => {
  console.error("Fatal error during server startup:", error);
  process.exit(1);
});

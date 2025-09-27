#!/usr/bin/env node

import { PlaywrightMCPServer } from './server.js';

async function main() {
  const server = new PlaywrightMCPServer();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const transport = args.includes('--streamable-http') ? 'streamableHttp' : 'stdio';
  const portArg = args.find(arg => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : 3000;
  
  try {
    await server.start(transport, port);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

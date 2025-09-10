#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { Logger } from './utils/logger.js';

// For ESM, we need to create require to load package.json
// In CommonJS build, import.meta.url is undefined, so we use __filename fallback
let requireUrl: string;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  requireUrl = import.meta.url;
} else if (typeof __filename !== 'undefined') {
  requireUrl = __filename;
} else {
  requireUrl = `file://${process.cwd()}/package.json`;
}
const require = createRequire(requireUrl);
const packageJson = require('../package.json');

const program = new Command();
const logger = new Logger();


program
  .name('dchk')
  .description('UNIX-style domain availability checker (RDAP-first)')
  .version(packageJson.version)
  .argument('[domains...]', 'domain names to check (also reads from stdin)')
  .option('-v, --verbose', 'enable verbose output with response times and sources')
  .option('-q, --quiet', 'suppress non-error output')
  .option('-c, --concurrency <number>', 'maximum concurrent checks', '10')
  .option('-t, --timeout <number>', 'request timeout in milliseconds', '5000')
  .option('--no-fallback', 'disable authoritative RDAP fallback')
  .action(async (domains: string[], options: any) => {
    try {
      const { check } = await import('./commands/check.js');
      await check(domains, {
        verbose: options.verbose,
        quiet: options.quiet,
        concurrency: parseInt(options.concurrency, 10),
        timeout: parseInt(options.timeout, 10),
        fallback: options.fallback
      });
    } catch (error) {
      if (!options.quiet) {
        logger.error(`Domain check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(2);
    }
  });


// Function to run the CLI - only execute if this is the main module
export async function runCli(): Promise<void> {
  // Parse command line arguments
  program.parse(process.argv);
}

// Auto-run if this file is executed directly
// In CommonJS build, import.meta.url is undefined, so we check __filename
let isMainModule = false;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  isMainModule = import.meta.url === `file://${process.argv[1]}`;
} else if (typeof __filename !== 'undefined') {
  isMainModule = __filename === process.argv[1];
}

if (isMainModule) {
  runCli().catch((error) => {
    logger.error(`CLI failed to start: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

// Export the program for programmatic use
export default program;
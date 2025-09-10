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

// Global options state
interface GlobalOptions {
  verbose?: boolean | undefined;
  quiet?: boolean | undefined;
  dryRun?: boolean | undefined;
}

let globalOptions: GlobalOptions = {};

program
  .name('dchk')
  .description('CLI tools for development workflow')
  .version(packageJson.version)
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress non-error output')
  .option('-d, --dry-run', 'perform a dry run without making changes')
  .hook('preAction', (thisCommand) => {
    // Capture global options before any command runs
    const opts = thisCommand.opts();
    globalOptions = {
      verbose: opts['verbose'] as boolean | undefined,
      quiet: opts['quiet'] as boolean | undefined,
      dryRun: opts['dryRun'] as boolean | undefined,
    };

    // Configure logger based on global options
    if (globalOptions.quiet === true) {
      logger.setLevel('error');
    } else if (globalOptions.verbose === true) {
      logger.setLevel('debug');
    }
  });

// Status command - check status of various tools and integrations
program
  .command('status')
  .description('Check status of development tools')
  .option('-v, --verbose', 'verbose output')
  .option('-q, --quiet', 'quiet output')
  .action(async (options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      const { status } = await import('./commands/status.js');
      await status(mergedOptions);
    } catch (error) {
      logger.error(`Status check failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Function to run the CLI - only execute if this is the main module
export async function runCli(): Promise<void> {
  // Parse command line arguments
  program.parse(process.argv);

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
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
// Main library exports for dchk - UNIX-style domain availability checker

// Core domain checking functionality
export { checkDomain, isValidDomain } from './lib/rdap.js';
export { getAuthoritativeRdapUrl, clearIanaCache } from './lib/iana-rdap.js';

// Utility functions
export { runConcurrent, runConcurrentStreaming } from './utils/pool.js';
export { readStdinDomains, shouldReadStdin } from './utils/stdin.js';

// Types for domain checking
export type { CheckResult, CheckOptions, Status } from './types/domain.js';

// Command function for programmatic use
export { check } from './commands/check.js';

// CLI program for advanced programmatic use (note: importing this will not execute the CLI)
export { default as program } from './cli.js';
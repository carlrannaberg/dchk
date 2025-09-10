// Main library exports

// Export utilities
export { Logger } from './utils/logger.js';
export { colors, symbols, status } from './utils/colors.js';

// Export types
export type { LogLevel } from './utils/logger.js';

// Export the CLI program for programmatic use (note: importing this will not execute the CLI)
export { default as program } from './cli.js';
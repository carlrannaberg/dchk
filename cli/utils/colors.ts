import picocolors from 'picocolors';
import chalk from 'chalk';

// Use picocolors for performance and chalk for advanced features
export const colors = {
  // Basic colors using picocolors
  red: picocolors.red,
  green: picocolors.green,
  yellow: picocolors.yellow,
  blue: picocolors.blue,
  magenta: picocolors.magenta,
  cyan: picocolors.cyan,
  white: picocolors.white,
  gray: picocolors.gray,
  dim: picocolors.dim,
  bold: picocolors.bold,
  
  // Advanced styling using chalk
  success: chalk.green.bold,
  error: chalk.red.bold,
  warning: chalk.yellow.bold,
  info: chalk.blue.bold,
  highlight: chalk.cyan.bold,
  muted: chalk.gray,
  
  // Status indicators
  check: chalk.green('✓'),
  cross: chalk.red('✗'),
  warning_icon: chalk.yellow('⚠'),
  info_icon: chalk.blue('ℹ'),
};

// Export symbols for consistent use
export const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  bullet: '•',
  arrow: '→',
};

// Export status helpers
export const status = {
  success: (message: string) => `${colors.check} ${message}`,
  error: (message: string) => `${colors.cross} ${message}`,
  warning: (message: string) => `${colors.warning_icon} ${message}`,
  info: (message: string) => `${colors.info_icon} ${message}`,
};
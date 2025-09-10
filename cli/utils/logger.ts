import { colors } from './colors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.level];
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(`${colors.dim('[DEBUG]')} ${message}`);
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(`${colors.blue('ℹ')} ${message}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`${colors.yellow('⚠')} ${message}`);
    }
  }

  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(`${colors.red('✗')} ${message}`);
    }
  }

  success(message: string): void {
    if (this.shouldLog('info')) {
      console.log(`${colors.green('✓')} ${message}`);
    }
  }
}
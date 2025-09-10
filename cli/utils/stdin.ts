import { createInterface } from 'node:readline';
import { stdin } from 'node:process';

/**
 * Read domain names from stdin, one per line
 * @returns Promise resolving to array of domain strings
 */
export async function readStdinDomains(): Promise<string[]> {
  // Skip stdin reading if we're in an interactive terminal (TTY)
  if (stdin.isTTY) {
    return [];
  }

  const readline = createInterface({
    input: stdin,
    crlfDelay: Infinity // Handle Windows line endings properly
  });

  const domains: string[] = [];

  try {
    for await (const line of readline) {
      const domain = line.trim();
      if (domain) {
        domains.push(domain);
      }
    }
  } finally {
    readline.close();
  }

  return domains;
}

/**
 * Check if stdin has data available (non-TTY)
 * @returns boolean indicating if stdin should be read
 */
export function shouldReadStdin(): boolean {
  return !stdin.isTTY;
}
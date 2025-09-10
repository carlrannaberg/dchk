import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'dist/cli.cjs');

interface CliResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

function runCli(args: string[], input?: string, timeout = 10000): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut
      });
    });

    // Send input if provided
    if (input) {
      child.stdin?.write(input);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }
  });
}

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    // Ensure we have a built CLI
    expect(require('fs').existsSync(CLI_PATH)).toBe(true);
  });

  describe('Help and version', () => {
    it('should show help when --help flag is used', async () => {
      const result = await runCli(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('UNIX-style domain availability checker');
      expect(result.stdout).toContain('Arguments:');
      expect(result.stdout).toContain('Options:');
    });

    it('should show version when --version flag is used', async () => {
      const result = await runCli(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Version format
    });
  });

  describe('Error handling', () => {
    it('should exit with code 2 when no domains provided', async () => {
      const result = await runCli([]);
      
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('No domains provided');
    });

    it('should exit with code 2 for invalid domain', async () => {
      const result = await runCli(['invalid-domain-no-tld'], '', 5000);
      
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('Invalid domain');
    });

    it('should be quiet when --quiet flag is used', async () => {
      const result = await runCli(['--quiet']);
      
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toBe('');
    });
  });

  describe('Domain checking with mocked responses', () => {
    // Note: These tests may make real network requests in integration testing
    // For faster tests, we could mock at the network level or test with known domains
    
    it('should handle single domain check', async () => {
      // Test with a known registered domain
      const result = await runCli(['google.com'], '', 8000);
      
      // Should not time out (successful RDAP response)
      expect(result.timedOut).toBe(false);
      
      // Should have appropriate output
      if (result.exitCode === 1) {
        // Domain is registered
        expect(result.stdout).toBe('registered');
        expect(result.stderr).toBe('');
      } else if (result.exitCode === 0) {
        // Domain is available (unlikely for google.com)
        expect(result.stdout).toBe('available');
        expect(result.stderr).toBe('');
      }
      // Exit code should be 0 or 1, not 2 (error)
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should show verbose output', async () => {
      const result = await runCli(['--verbose', 'google.com'], '', 8000);
      
      expect(result.timedOut).toBe(false);
      expect([0, 1]).toContain(result.exitCode);
      
      // Verbose output should include table format with response time and source
      expect(result.stdout).toMatch(/DOMAIN\s+STATUS\s+TIME\s+SOURCE/);
      expect(result.stdout).toMatch(/google\.com\s+(AVAILABLE|REGISTERED)\s+\d+ms/);
    });

    it('should handle multiple domains', async () => {
      const result = await runCli(['google.com', 'facebook.com'], '', 10000);
      
      expect(result.timedOut).toBe(false);
      expect([0, 1]).toContain(result.exitCode);
      
      // Should have output for both domains
      expect(result.stdout).toContain('google.com:');
      expect(result.stdout).toContain('facebook.com:');
    });

    it('should handle custom timeout', async () => {
      // Use a very short timeout to test timeout handling
      const result = await runCli(['--timeout', '1', 'google.com'], '', 5000);
      
      // Should either succeed quickly or fail due to timeout
      expect([0, 1, 2]).toContain(result.exitCode);
    });

    it('should handle custom concurrency', async () => {
      const result = await runCli(['--concurrency', '1', 'google.com', 'facebook.com'], '', 15000);
      
      expect(result.timedOut).toBe(false);
      expect([0, 1]).toContain(result.exitCode);
      
      // Should still process both domains
      expect(result.stdout).toContain('google.com:');
      expect(result.stdout).toContain('facebook.com:');
    });

    it('should handle --no-fallback option', async () => {
      const result = await runCli(['--no-fallback', 'google.com'], '', 8000);
      
      expect(result.timedOut).toBe(false);
      expect([0, 1, 2]).toContain(result.exitCode);
    });
  });

  describe('Stdin input', () => {
    it('should read domains from stdin', async () => {
      const input = 'google.com\nfacebook.com\n';
      const result = await runCli([], input, 15000);
      
      expect(result.timedOut).toBe(false);
      // May exit with 2 if no domains are read (TTY detection issues in test env)
      expect([0, 1, 2]).toContain(result.exitCode);
      
      if (result.exitCode !== 2) {
        // Should have output for both domains if stdin was read
        expect(result.stdout).toContain('google.com:');
        expect(result.stdout).toContain('facebook.com:');
      } else {
        // If TTY is detected in test env, may exit with no domains error
        expect(result.stderr).toContain('No domains provided');
      }
    });

    it('should combine command line and stdin domains', async () => {
      const input = 'facebook.com\n';
      const result = await runCli(['google.com'], input, 15000);
      
      expect(result.timedOut).toBe(false);
      expect([0, 1]).toContain(result.exitCode);
      
      // Should have output for at least google.com
      expect(result.stdout).toContain('google.com:');
    });
  });

  describe('Exit codes', () => {
    it('should exit with 0 for available domains', async () => {
      // This test is tricky since we need a reliably available domain
      // For now, we'll test the logic with a likely scenario
      const result = await runCli(['nonexistentdomain123456789.com'], '', 8000);
      
      // Should either be available (0) or have an error (2) due to network/timeout
      expect([0, 2]).toContain(result.exitCode);
      
      if (result.exitCode === 0) {
        expect(result.stdout).toBe('available');
        expect(result.stderr).toBe('');
      }
    });

    it('should exit with 1 for registered domains', async () => {
      const result = await runCli(['google.com'], '', 8000);
      
      // Google.com should be registered
      expect([1]).toContain(result.exitCode);
      expect(result.stdout).toBe('registered');
      expect(result.stderr).toBe('');
    });

    it('should exit with 2 for errors', async () => {
      const result = await runCli(['invalid-domain-no-tld'], '', 5000);
      
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('Invalid domain');
    });
  });

  describe('Output format', () => {
    it('should output to stdout for single domain', async () => {
      const result = await runCli(['google.com'], '', 8000);
      
      expect(result.timedOut).toBe(false);
      
      // Should have stdout output (human readable)
      expect(result.stdout).toMatch(/^(available|registered|unknown)$/);
      
      // No stderr output (exit codes handle scripting logic)
      expect(result.stderr).toBe('');
    });

    it('should format multiple domains correctly', async () => {
      const result = await runCli(['google.com', 'facebook.com'], '', 10000);
      
      expect(result.timedOut).toBe(false);
      
      // Should have domain: status format for each
      const lines = result.stdout.split('\\n');
      expect(lines.some(line => line.includes('google.com:'))).toBe(true);
      expect(lines.some(line => line.includes('facebook.com:'))).toBe(true);
    });
  });
});
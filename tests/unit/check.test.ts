import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { check } from '../../cli/commands/check.js';
import type { CheckResult } from '../../cli/types/domain.js';

// Mock all dependencies
vi.mock('../../cli/lib/rdap.js', () => ({
  checkDomain: vi.fn(),
  isValidDomain: vi.fn()
}));

vi.mock('../../cli/utils/stdin.js', () => ({
  readStdinDomains: vi.fn(),
  shouldReadStdin: vi.fn()
}));

vi.mock('../../cli/utils/pool.js', () => ({
  runConcurrent: vi.fn()
}));

// Import mocked functions with proper typing
import { checkDomain, isValidDomain } from '../../cli/lib/rdap.js';
import { readStdinDomains, shouldReadStdin } from '../../cli/utils/stdin.js';
import { runConcurrent } from '../../cli/utils/pool.js';

// Mock console and process
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
const mockProcessExit = vi.fn();

const originalConsole = global.console;
const originalProcessExit = process.exit;

describe('Check Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console
    global.console = {
      ...originalConsole,
      log: mockConsoleLog,
      error: mockConsoleError
    };
    
    // Mock process.exit
    process.exit = mockProcessExit as any;
    
    // Default mock implementations
    vi.mocked(shouldReadStdin).mockReturnValue(false);
    vi.mocked(readStdinDomains).mockResolvedValue([]);
    vi.mocked(isValidDomain).mockReturnValue(true);
    vi.mocked(runConcurrent).mockImplementation(async (items, concurrency, worker) => {
      return Promise.all(items.map(worker));
    });
  });

  afterEach(() => {
    // Restore original functions
    global.console = originalConsole;
    process.exit = originalProcessExit;
  });

  describe('Input handling', () => {
    it('should handle single domain from command line', async () => {
      const mockResult: CheckResult = {
        domain: 'example.com',
        status: 'available',
        httpStatus: 404,
        responseTimeMs: 150
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['example.com']);
      
      expect(checkDomain).toHaveBeenCalledWith('example.com', {
        timeoutMs: 5000,
        fallback: true
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('available');
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should handle multiple domains from command line', async () => {
      const mockResults: CheckResult[] = [
        { domain: 'example.com', status: 'available', httpStatus: 404, responseTimeMs: 150 },
        { domain: 'google.com', status: 'registered', httpStatus: 200, responseTimeMs: 120 }
      ];
      
      vi.mocked(checkDomain)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      
      await check(['example.com', 'google.com']);
      
      expect(runConcurrent).toHaveBeenCalledWith(
        ['example.com', 'google.com'],
        2,
        expect.any(Function)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('example.com: available');
      expect(mockConsoleLog).toHaveBeenCalledWith('google.com: registered');
      expect(mockProcessExit).toHaveBeenCalledWith(1); // Mixed results
    });

    it('should read domains from stdin when available', async () => {
      vi.mocked(shouldReadStdin).mockReturnValue(true);
      vi.mocked(readStdinDomains).mockResolvedValue(['stdin-example.com']);
      
      const mockResult: CheckResult = {
        domain: 'stdin-example.com',
        status: 'available',
        httpStatus: 404,
        responseTimeMs: 150
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check([]);
      
      expect(shouldReadStdin).toHaveBeenCalled();
      expect(readStdinDomains).toHaveBeenCalled();
      expect(checkDomain).toHaveBeenCalledWith('stdin-example.com', expect.any(Object));
    });

    it('should combine command line and stdin domains', async () => {
      vi.mocked(shouldReadStdin).mockReturnValue(true);
      vi.mocked(readStdinDomains).mockResolvedValue(['stdin-domain.com']);
      
      const mockResults: CheckResult[] = [
        { domain: 'cli-domain.com', status: 'available', httpStatus: 404, responseTimeMs: 150 },
        { domain: 'stdin-domain.com', status: 'registered', httpStatus: 200, responseTimeMs: 120 }
      ];
      
      vi.mocked(checkDomain)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      
      await check(['cli-domain.com']);
      
      expect(runConcurrent).toHaveBeenCalledWith(
        ['cli-domain.com', 'stdin-domain.com'],
        2,
        expect.any(Function)
      );
    });
  });

  describe('Error handling', () => {
    it('should exit with error when no domains provided', async () => {
      vi.mocked(shouldReadStdin).mockReturnValue(false);
      
      await check([]);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: No domains provided. Use --help for usage information.'
      );
      expect(mockProcessExit).toHaveBeenCalledWith(2);
    });

    it('should exit with error for invalid domains', async () => {
      vi.mocked(isValidDomain).mockReturnValue(false);
      
      await check(['invalid-domain']);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: Invalid domain(s): invalid-domain'
      );
      expect(mockProcessExit).toHaveBeenCalledWith(2);
    });

    it('should handle multiple invalid domains', async () => {
      vi.mocked(isValidDomain)
        .mockReturnValueOnce(true)  // valid.com
        .mockReturnValueOnce(false) // invalid1
        .mockReturnValueOnce(false); // invalid2
      
      await check(['valid.com', 'invalid1', 'invalid2']);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: Invalid domain(s): invalid1, invalid2'
      );
      expect(mockProcessExit).toHaveBeenCalledWith(2);
    });

    it('should handle RDAP check errors gracefully', async () => {
      vi.mocked(checkDomain).mockRejectedValue(new Error('Network error'));
      
      await check(['example.com']);
      
      expect(mockConsoleError).toHaveBeenCalledWith('Error: Network error');
      expect(mockProcessExit).toHaveBeenCalledWith(2);
    });

    it('should handle unknown status as error', async () => {
      const mockResult: CheckResult = {
        domain: 'example.com',
        status: 'unknown',
        httpStatus: 500,
        responseTimeMs: 150
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['example.com']);
      
      expect(mockProcessExit).toHaveBeenCalledWith(2);
    });
  });

  describe('Output modes', () => {
    it('should output verbose information', async () => {
      const mockResult: CheckResult = {
        domain: 'example.com',
        status: 'available',
        httpStatus: 404,
        responseTimeMs: 150,
        source: 'https://rdap.org/domain/example.com'
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['example.com'], { verbose: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'example.com: AVAILABLE (150ms) via rdap.org'
      );
    });

    it('should output verbose information for registered domain', async () => {
      const mockResult: CheckResult = {
        domain: 'google.com',
        status: 'registered',
        httpStatus: 200,
        responseTimeMs: 120,
        source: 'https://rdap.verisign.com/com/v1/domain/google.com'
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['google.com'], { verbose: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'google.com: REGISTERED (120ms) via rdap.verisign.com'
      );
    });

    it('should output verbose error information', async () => {
      const mockResult: CheckResult = {
        domain: 'error.com',
        status: 'unknown',
        httpStatus: 500,
        responseTimeMs: 200
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['error.com'], { verbose: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith('error.com: UNKNOWN (200ms)');
      expect(mockConsoleError).toHaveBeenCalledWith('  HTTP 500');
    });

    it('should be quiet when quiet option is set', async () => {
      await check([], { quiet: true });
      
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error: No domains provided')
      );
    });
  });

  describe('Exit codes', () => {
    it('should exit 0 for all available domains', async () => {
      const mockResults: CheckResult[] = [
        { domain: 'available1.com', status: 'available', httpStatus: 404 },
        { domain: 'available2.com', status: 'available', httpStatus: 404 }
      ];
      
      vi.mocked(checkDomain)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      
      await check(['available1.com', 'available2.com']);
      
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should exit 1 for all registered domains', async () => {
      const mockResults: CheckResult[] = [
        { domain: 'registered1.com', status: 'registered', httpStatus: 200 },
        { domain: 'registered2.com', status: 'registered', httpStatus: 200 }
      ];
      
      vi.mocked(checkDomain)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      
      await check(['registered1.com', 'registered2.com']);
      
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should exit 1 for mixed results', async () => {
      const mockResults: CheckResult[] = [
        { domain: 'available.com', status: 'available', httpStatus: 404 },
        { domain: 'registered.com', status: 'registered', httpStatus: 200 }
      ];
      
      vi.mocked(checkDomain)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      
      await check(['available.com', 'registered.com']);
      
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should exit 2 for domains with errors', async () => {
      const mockResults: CheckResult[] = [
        { domain: 'available.com', status: 'available', httpStatus: 404 },
        { domain: 'error.com', status: 'unknown', httpStatus: 500 }
      ];
      
      vi.mocked(checkDomain)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      
      await check(['available.com', 'error.com']);
      
      expect(mockProcessExit).toHaveBeenCalledWith(2);
    });
  });

  describe('Configuration options', () => {
    it('should use custom concurrency', async () => {
      const mockResult: CheckResult = {
        domain: 'example.com',
        status: 'available',
        httpStatus: 404
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['domain1.com', 'domain2.com', 'domain3.com'], { concurrency: 5 });
      
      expect(runConcurrent).toHaveBeenCalledWith(
        ['domain1.com', 'domain2.com', 'domain3.com'],
        5,
        expect.any(Function)
      );
    });

    it('should use custom timeout', async () => {
      const mockResult: CheckResult = {
        domain: 'example.com',
        status: 'available',
        httpStatus: 404
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['example.com'], { timeout: 10000 });
      
      expect(checkDomain).toHaveBeenCalledWith('example.com', {
        timeoutMs: 10000,
        fallback: true
      });
    });

    it('should disable fallback when requested', async () => {
      const mockResult: CheckResult = {
        domain: 'example.com',
        status: 'available',
        httpStatus: 404
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(['example.com'], { fallback: false });
      
      expect(checkDomain).toHaveBeenCalledWith('example.com', {
        timeoutMs: 5000,
        fallback: false
      });
    });

    it('should default concurrency to min of 10 or domain count', async () => {
      const domains = Array.from({ length: 15 }, (_, i) => `domain${i}.com`);
      const mockResult: CheckResult = {
        domain: 'test.com',
        status: 'available',
        httpStatus: 404
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(domains);
      
      expect(runConcurrent).toHaveBeenCalledWith(
        domains,
        10,  // Should cap at 10
        expect.any(Function)
      );
    });

    it('should use domain count when less than 10', async () => {
      const domains = ['domain1.com', 'domain2.com'];
      const mockResult: CheckResult = {
        domain: 'test.com',
        status: 'available',
        httpStatus: 404
      };
      
      vi.mocked(checkDomain).mockResolvedValue(mockResult);
      
      await check(domains);
      
      expect(runConcurrent).toHaveBeenCalledWith(
        domains,
        2,  // Should use actual count
        expect.any(Function)
      );
    });
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkDomain, isValidDomain } from '../../cli/lib/rdap.js';
import type { CheckResult } from '../../cli/types/domain.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock IANA module to avoid network calls
vi.mock('../../cli/lib/iana-rdap.js', () => ({
  getAuthoritativeRdapUrl: vi.fn().mockResolvedValue('https://rdap.example.com')
}));

describe('RDAP Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isValidDomain', () => {
    it('should validate correct domain names', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('test-domain.ai')).toBe(true);
      expect(isValidDomain('a.b')).toBe(true);
    });

    it('should reject invalid domain names', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('invalid')).toBe(false);
      expect(isValidDomain('..example.com')).toBe(false);
      expect(isValidDomain('example..com')).toBe(false);
      expect(isValidDomain('.example.com')).toBe(false);
      expect(isValidDomain('example.com.')).toBe(false);
      expect(isValidDomain('-example.com')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(isValidDomain(null as any)).toBe(false);
      expect(isValidDomain(undefined as any)).toBe(false);
      expect(isValidDomain(123 as any)).toBe(false);
    });
  });

  describe('checkDomain', () => {
    it('should return available for HTTP 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        url: 'https://rdap.org/domain/available-domain.com',
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.resolve(null)
      });

      const result = await checkDomain('available-domain.com');

      expect(result).toEqual({
        domain: 'available-domain.com',
        status: 'available',
        httpStatus: 404,
        errorCode: 404,
        source: 'rdap.org',
        responseTimeMs: expect.any(Number)
      });
    });

    it('should return available for errorCode 404 in JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://rdap.org/domain/available-domain.com',
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.resolve({ errorCode: 404 })
      });

      const result = await checkDomain('available-domain.com');

      expect(result).toEqual({
        domain: 'available-domain.com',
        status: 'available',
        httpStatus: 200,
        errorCode: 404,
        source: 'rdap.org',
        responseTimeMs: expect.any(Number)
      });
    });

    it('should return registered for HTTP 200 with valid RDAP data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://rdap.org/domain/registered-domain.com',
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.resolve({
          objectClassName: 'domain',
          ldhName: 'registered-domain.com',
          status: ['active']
        })
      });

      const result = await checkDomain('registered-domain.com');

      expect(result).toEqual({
        domain: 'registered-domain.com',
        status: 'registered',
        httpStatus: 200,
        source: 'rdap.org',
        responseTimeMs: expect.any(Number)
      });
    });

    it('should handle redirect and use final URL as source', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://rdap.verisign.com/com/v1/domain/example.com', // Final URL after redirect
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.resolve({
          objectClassName: 'domain',
          ldhName: 'example.com'
        })
      });

      const result = await checkDomain('example.com');

      expect(result.source).toBe('https://rdap.verisign.com/com/v1/domain/example.com');
      expect(result.status).toBe('registered');
    });

    it('should return unknown for server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        url: 'https://rdap.org/domain/error-domain.com',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ error: 'Server error' })
      });

      const result = await checkDomain('error-domain.com');

      expect(result.status).toBe('unknown');
      expect(result.httpStatus).toBe(500);
    });

    it('should try authoritative fallback when rdap.org fails', async () => {
      // First call to rdap.org fails
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          url: 'https://rdap.org/domain/fallback-test.com',
          headers: new Map(),
          json: () => Promise.resolve(null)
        })
        // Second call to authoritative succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://rdap.example.com/domain/fallback-test.com',
          headers: new Map([['content-type', 'application/rdap+json']]),
          json: () => Promise.resolve({
            objectClassName: 'domain',
            ldhName: 'fallback-test.com'
          })
        });

      const result = await checkDomain('fallback-test.com');

      expect(result.status).toBe('registered');
      expect(result.source).toBe('https://rdap.example.com');
    });

    it('should skip fallback when fallback option is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        url: 'https://rdap.org/domain/no-fallback.com',
        headers: new Map(),
        json: () => Promise.resolve(null)
      });

      const result = await checkDomain('no-fallback.com', { fallback: false });

      expect(result.status).toBe('unknown');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one call, no fallback
    });

    it('should handle network timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await checkDomain('timeout-domain.com', { timeoutMs: 1000 });

      expect(result.status).toBe('unknown');
      expect(result.responseTimeMs).toBe(0);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://rdap.org/domain/bad-json.com',
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await checkDomain('bad-json.com');

      expect(result.status).toBe('registered'); // HTTP 200 with null JSON = registered
    });

    it('should use custom timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await checkDomain('timeout-test.com', { timeoutMs: 100 });
      
      expect(result.status).toBe('unknown');
    });

    it('should handle content-type text/plain with JSON content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        url: 'https://rdap.org/domain/plain-text.com',
        headers: new Map([['content-type', 'text/plain']]),
        json: () => Promise.reject(new Error('Not JSON')),
        text: () => Promise.resolve('{"errorCode": 404}')
      });

      const result = await checkDomain('plain-text.com');

      expect(result.status).toBe('available');
      expect(result.errorCode).toBe(404);
    });

    it('should include User-Agent header in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://rdap.org/domain/user-agent-test.com',
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.resolve({ objectClassName: 'domain' })
      });

      await checkDomain('user-agent-test.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://rdap.org/domain/user-agent-test.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'dchk/0.1.0'
          })
        })
      );
    });

    it('should properly encode domain names with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://rdap.org/domain/test%40example.com',
        headers: new Map([['content-type', 'application/rdap+json']]),
        json: () => Promise.resolve({ objectClassName: 'domain' })
      });

      await checkDomain('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://rdap.org/domain/test%40example.com',
        expect.any(Object)
      );
    });
  });
});
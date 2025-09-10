import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAuthoritativeRdapUrl, clearIanaCache } from '../../cli/lib/iana-rdap.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample IANA bootstrap data
const mockIanaData = {
  services: [
    [
      ['com', 'net'],
      ['https://rdap.verisign.com/com/v1/', 'https://rdap.verisign.com/net/v1/']
    ],
    [
      ['org'],
      ['https://rdap.publicinterestregistry.org/rdap/']
    ],
    [
      ['ai'],
      ['https://rdap.identitydigital.services/rdap/']
    ],
    [
      ['io'],
      ['https://rdap.nic.io/', 'https://rdap2.nic.io/']
    ]
  ]
};

describe('IANA RDAP Bootstrap Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    clearIanaCache(); // Clear cache before each test
  });

  afterEach(() => {
    vi.useRealTimers();
    clearIanaCache();
  });

  describe('getAuthoritativeRdapUrl', () => {
    it('should return correct RDAP URL for .com domain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('example.com');
      
      expect(url).toBe('https://rdap.verisign.com/com/v1/');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.iana.org/rdap/dns.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'User-Agent': 'dchk/0.1.0'
          })
        })
      );
    });

    it('should return correct RDAP URL for .org domain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('example.org');
      
      expect(url).toBe('https://rdap.publicinterestregistry.org/rdap/');
    });

    it('should return correct RDAP URL for .ai domain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('startup.ai');
      
      expect(url).toBe('https://rdap.identitydigital.services/rdap/');
    });

    it('should handle subdomains correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('sub.example.com');
      
      expect(url).toBe('https://rdap.verisign.com/com/v1/');
    });

    it('should return null for unsupported TLD', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('example.xyz');
      
      expect(url).toBe(null);
    });

    it('should return null for invalid domain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('invalid');
      
      expect(url).toBe(null);
    });

    it('should cache IANA data and not fetch again', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      // First call
      const url1 = await getAuthoritativeRdapUrl('example.com');
      expect(url1).toBe('https://rdap.verisign.com/com/v1/');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const url2 = await getAuthoritativeRdapUrl('test.org');
      expect(url2).toBe('https://rdap.publicinterestregistry.org/rdap/');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still just one fetch call
    });

    it('should refetch after cache expires', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      // First call
      await getAuthoritativeRdapUrl('example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by more than 1 hour (cache TTL)
      vi.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      // Second call - should fetch again
      await getAuthoritativeRdapUrl('example.org');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle IANA fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const url = await getAuthoritativeRdapUrl('example.com');
      
      expect(url).toBe(null);
    });

    it('should handle IANA HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Server error'))
      });

      const url = await getAuthoritativeRdapUrl('example.com');
      
      expect(url).toBe(null);
    });

    it('should handle malformed IANA data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: 'data' })
      });

      const url = await getAuthoritativeRdapUrl('example.com');
      
      expect(url).toBe(null);
    });

    it('should handle IANA data with empty services', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ services: [] })
      });

      const url = await getAuthoritativeRdapUrl('example.com');
      
      expect(url).toBe(null);
    });

    it('should handle IANA data with malformed service entries', async () => {
      const badData = {
        services: [
          [['com'], []], // Empty URLs array
          [[], ['https://example.com']], // Empty TLDs array
          ['invalid'], // Not an array
          [['net'], null], // Null URLs
          [['org'], ['https://example.org']], // Valid entry
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(badData)
      });

      const url1 = await getAuthoritativeRdapUrl('example.com');
      expect(url1).toBe(null);

      const url2 = await getAuthoritativeRdapUrl('example.org');
      expect(url2).toBe('https://example.org');
    });

    it('should handle case-insensitive TLD matching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url1 = await getAuthoritativeRdapUrl('EXAMPLE.COM');
      const url2 = await getAuthoritativeRdapUrl('example.COM');
      const url3 = await getAuthoritativeRdapUrl('Example.Com');
      
      expect(url1).toBe('https://rdap.verisign.com/com/v1/');
      expect(url2).toBe('https://rdap.verisign.com/com/v1/');
      expect(url3).toBe('https://rdap.verisign.com/com/v1/');
    });

    it('should return first URL when multiple URLs are available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      // .io has multiple RDAP URLs, should return the first one
      const url = await getAuthoritativeRdapUrl('example.io');
      
      expect(url).toBe('https://rdap.nic.io/');
    });

    it('should handle domains with many subdomains', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      const url = await getAuthoritativeRdapUrl('a.b.c.d.example.com');
      
      expect(url).toBe('https://rdap.verisign.com/com/v1/');
    });
  });

  describe('clearIanaCache', () => {
    it('should clear the cache and force new fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIanaData)
      });

      // First call
      await getAuthoritativeRdapUrl('example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearIanaCache();

      // Second call - should fetch again
      await getAuthoritativeRdapUrl('example.org');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
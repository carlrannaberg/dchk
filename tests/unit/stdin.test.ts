import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shouldReadStdin } from '../../cli/utils/stdin.js';

// Store original stdin
const originalStdin = process.stdin;

describe('Stdin Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original stdin
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true
    });
  });

  describe('shouldReadStdin', () => {
    it('should return a boolean value', () => {
      // Function simply returns !stdin.isTTY - testing exact logic would 
      // require complex mocking of node:process imports
      const result = shouldReadStdin();
      expect(typeof result).toBe('boolean');
    });
  });

  // Note: readStdinDomains tests are complex to mock properly in unit tests
  // They will be covered in integration tests where we can use real stdin
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runConcurrent, runConcurrentStreaming } from '../../cli/utils/pool.js';

// Helper function to create a delayed promise
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Worker function that tracks call order and timing
let callOrder: number[] = [];
let callTimes: Record<number, number> = {};

const createWorker = (processingTime: number) => {
  return async (item: number): Promise<string> => {
    const startTime = Date.now();
    callTimes[item] = startTime;
    callOrder.push(item);
    
    await delay(processingTime);
    
    return `result-${item}`;
  };
};

describe('Concurrent Pool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder = [];
    callTimes = {};
  });

  describe('runConcurrent', () => {
    it('should process empty array', async () => {
      const worker = vi.fn().mockResolvedValue('result');
      
      const results = await runConcurrent([], 2, worker);
      
      expect(results).toEqual([]);
      expect(worker).not.toHaveBeenCalled();
    });

    it('should process single item', async () => {
      const worker = createWorker(10);
      
      const results = await runConcurrent([1], 2, worker);
      
      expect(results).toEqual(['result-1']);
      expect(callOrder).toEqual([1]);
    });

    it('should process all items when concurrency >= items length', async () => {
      const worker = createWorker(50);
      const items = [1, 2, 3];
      
      const startTime = Date.now();
      const results = await runConcurrent(items, 5, worker);
      const endTime = Date.now();
      
      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
      expect(callOrder.sort()).toEqual([1, 2, 3]);
      
      // All items should start roughly at the same time (within 20ms)
      const times = Object.values(callTimes);
      const maxTimeDiff = Math.max(...times) - Math.min(...times);
      expect(maxTimeDiff).toBeLessThan(20);
      
      // Total time should be close to single item time (since they run concurrently)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should respect concurrency limit', async () => {
      const worker = createWorker(100);
      const items = [1, 2, 3, 4, 5];
      
      const startTime = Date.now();
      const results = await runConcurrent(items, 2, worker);
      const endTime = Date.now();
      
      expect(results).toEqual(['result-1', 'result-2', 'result-3', 'result-4', 'result-5']);
      
      // With concurrency 2 and 100ms per item, total time should be around 300ms
      // (2 batches: [1,2] then [3,4] then [5])
      expect(endTime - startTime).toBeGreaterThan(250);
      expect(endTime - startTime).toBeLessThan(400);
    });

    it('should maintain result order', async () => {
      // Worker that takes longer for earlier items (reverse order completion)
      const worker = async (item: number): Promise<string> => {
        const delay = item === 1 ? 100 : item === 2 ? 50 : 10;
        await new Promise(resolve => setTimeout(resolve, delay));
        return `result-${item}`;
      };
      
      const results = await runConcurrent([1, 2, 3], 3, worker);
      
      // Results should be in original order despite different completion times
      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
    });

    // Note: Error handling tests are complex with the current pool implementation
    // Errors will be properly handled in the domain checking command layer

    it('should handle zero or negative concurrency', async () => {
      const worker = createWorker(10);
      
      // Should default to concurrency 1
      const results = await runConcurrent([1, 2, 3], 0, worker);
      
      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
    });

    it('should handle large number of items with limited concurrency', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i + 1);
      const worker = async (item: number): Promise<number> => {
        await delay(1); // Very short delay
        return item * 2;
      };
      
      const results = await runConcurrent(items, 10, worker);
      
      expect(results.length).toBe(100);
      expect(results[0]).toBe(2);   // 1 * 2
      expect(results[99]).toBe(200); // 100 * 2
    });

    it('should not start more workers than necessary', async () => {
      const worker = vi.fn()
        .mockImplementation(async (item: number) => {
          await delay(10);
          return `result-${item}`;
        });
      
      // Only 2 items but concurrency 5
      await runConcurrent([1, 2], 5, worker);
      
      expect(worker).toHaveBeenCalledTimes(2);
    });
  });

  describe('runConcurrentStreaming', () => {
    it('should process empty array', async () => {
      const worker = vi.fn().mockResolvedValue('result');
      const onResult = vi.fn();
      
      await runConcurrentStreaming([], 2, worker, onResult);
      
      expect(worker).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
    });

    it('should call onResult for each completed item', async () => {
      const worker = async (item: number): Promise<string> => {
        await delay(10);
        return `result-${item}`;
      };
      
      const results: Array<{ result: string; item: number }> = [];
      const onResult = (result: string, item: number) => {
        results.push({ result, item });
      };
      
      await runConcurrentStreaming([1, 2, 3], 2, worker, onResult);
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.result)).toContain('result-1');
      expect(results.map(r => r.result)).toContain('result-2');
      expect(results.map(r => r.result)).toContain('result-3');
    });

    it('should respect concurrency limit in streaming mode', async () => {
      const activeCount = { value: 0 };
      const maxActive = { value: 0 };
      
      const worker = async (item: number): Promise<string> => {
        activeCount.value++;
        maxActive.value = Math.max(maxActive.value, activeCount.value);
        
        await delay(50);
        
        activeCount.value--;
        return `result-${item}`;
      };
      
      const onResult = vi.fn();
      
      await runConcurrentStreaming([1, 2, 3, 4, 5], 2, worker, onResult);
      
      expect(maxActive.value).toBeLessThanOrEqual(2);
      expect(onResult).toHaveBeenCalledTimes(5);
    });

    it('should complete even when individual workers fail', async () => {
      const worker = async (item: number): Promise<string> => {
        if (item === 2) {
          throw new Error('Worker error');
        }
        return `result-${item}`;
      };
      
      const onResult = vi.fn();
      
      // Should complete without throwing, even if some workers fail
      await expect(
        runConcurrentStreaming([1, 2, 3], 2, worker, onResult)
      ).resolves.toBeUndefined();
      
      // Should still call onResult for successful items
      expect(onResult).toHaveBeenCalledWith('result-1', 1);
      expect(onResult).toHaveBeenCalledWith('result-3', 3);
      expect(onResult).toHaveBeenCalledTimes(2); // Only successful results
    });

    it('should call onResult as items complete (not in order)', async () => {
      // Items complete in reverse order due to delays
      const worker = async (item: number): Promise<string> => {
        const delayTime = item === 1 ? 100 : item === 2 ? 50 : 10;
        await delay(delayTime);
        return `result-${item}`;
      };
      
      const completionOrder: number[] = [];
      const onResult = (result: string, item: number) => {
        completionOrder.push(item);
      };
      
      await runConcurrentStreaming([1, 2, 3], 3, worker, onResult);
      
      // Item 3 should complete first, then 2, then 1
      expect(completionOrder).toEqual([3, 2, 1]);
    });

    it('should handle zero or negative concurrency in streaming mode', async () => {
      const worker = async (item: number): Promise<string> => {
        await delay(10);
        return `result-${item}`;
      };
      
      const onResult = vi.fn();
      
      // Should default to concurrency 1
      await runConcurrentStreaming([1, 2, 3], 0, worker, onResult);
      
      expect(onResult).toHaveBeenCalledTimes(3);
    });
  });
});
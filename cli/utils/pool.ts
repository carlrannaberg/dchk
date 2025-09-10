/**
 * Process items concurrently with a maximum concurrency limit
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent operations
 * @param worker - Function to process each item
 * @returns Promise resolving to array of results in original order
 */
export async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  if (concurrency <= 0) {
    concurrency = 1;
  }

  // If concurrency is higher than items length, process all at once
  if (concurrency >= items.length) {
    return Promise.all(items.map(worker));
  }

  const results: R[] = new Array(items.length);
  let index = 0;
  const active: Promise<void>[] = [];

  const processNext = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      
      if (item === undefined) {
        continue;
      }
      
      const promise = worker(item)
        .then((result) => {
          results[currentIndex] = result;
        })
        .finally(() => {
          // Remove this promise from active list
          const promiseIndex = active.indexOf(promise);
          if (promiseIndex > -1) {
            active.splice(promiseIndex, 1);
          }
        });

      active.push(promise);

      // If we've reached the concurrency limit, wait for one to complete
      if (active.length >= concurrency) {
        await Promise.race(active);
      }
    }
  };

  // Start processing
  await processNext();

  // Wait for all remaining promises to complete
  await Promise.all(active);

  return results;
}

/**
 * Process items concurrently but return results as they complete (not in order)
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent operations
 * @param worker - Function to process each item
 * @param onResult - Callback for each completed result
 * @returns Promise that resolves when all items are processed
 */
export async function runConcurrentStreaming<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onResult: (result: R, item: T) => void
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  if (concurrency <= 0) {
    concurrency = 1;
  }

  let index = 0;
  const active: Promise<void>[] = [];

  const processNext = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      
      if (item === undefined) {
        continue;
      }
      
      const promise = worker(item)
        .then((result) => {
          onResult(result, item);
        })
        .catch(() => {
          // Silently handle worker errors - streaming should continue
          // Individual failures don't stop the overall process
        });

      // Create a wrapper promise that handles cleanup
      const wrappedPromise = promise
        .finally(() => {
          // Remove this promise from active list
          const promiseIndex = active.indexOf(wrappedPromise);
          if (promiseIndex > -1) {
            active.splice(promiseIndex, 1);
          }
        });

      active.push(wrappedPromise);

      // If we've reached the concurrency limit, wait for one to complete
      if (active.length >= concurrency) {
        await Promise.race(active);
      }
    }
  };

  // Start processing
  await processNext();

  // Wait for all remaining promises to complete
  await Promise.all(active);
}
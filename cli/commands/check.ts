import { checkDomain, isValidDomain } from '../lib/rdap.js';
import { readStdinDomains, shouldReadStdin } from '../utils/stdin.js';
import { runConcurrent } from '../utils/pool.js';

interface CheckOptions {
  verbose?: boolean;
  quiet?: boolean;
  concurrency?: number;
  timeout?: number;
  fallback?: boolean;
}

export async function check(domains: string[], options: CheckOptions = {}): Promise<void> {
  try {
    // Collect all domains from arguments and stdin
    const allDomains = [...domains];
    
    // Read from stdin if available (non-TTY)
    if (shouldReadStdin()) {
      const stdinDomains = await readStdinDomains();
      allDomains.push(...stdinDomains);
    }

    // Validate we have domains to check
    if (allDomains.length === 0) {
      if (!options.quiet) {
        console.error('Error: No domains provided. Use --help for usage information.');
      }
      process.exit(2);
    }

    // Validate all domains
    const invalidDomains = allDomains.filter(domain => !isValidDomain(domain));
    if (invalidDomains.length > 0) {
      if (!options.quiet) {
        console.error(`Error: Invalid domain(s): ${invalidDomains.join(', ')}`);
      }
      process.exit(2);
    }

    // Configure check options
    const checkOptions = {
      timeoutMs: options.timeout || 5000,
      fallback: options.fallback !== false
    };

    // Process domains concurrently
    const concurrency = options.concurrency || Math.min(10, allDomains.length);
    const results = await runConcurrent(
      allDomains,
      concurrency,
      (domain) => checkDomain(domain, checkOptions)
    );

    // Process results and determine overall status
    let overallStatus: 'available' | 'registered' | 'mixed' | 'error' = 'available';
    let hasErrors = false;

    for (const result of results) {
      if (result.status === 'unknown') {
        hasErrors = true;
      } else if (result.status === 'registered') {
        if (overallStatus === 'available') {
          overallStatus = 'registered';
        } else if (overallStatus !== 'registered') {
          overallStatus = 'mixed';
        }
      }
    }

    if (hasErrors) {
      overallStatus = 'error';
    }

    // Output results
    if (options.verbose) {
      // Verbose mode: detailed output
      for (const result of results) {
        const statusText = result.status === 'available' ? 'AVAILABLE' : 
                          result.status === 'registered' ? 'REGISTERED' : 'UNKNOWN';
        const responseTime = result.responseTimeMs ? ` (${result.responseTimeMs}ms)` : '';
        const source = result.source ? ` via ${new URL(result.source).hostname}` : '';
        
        console.log(`${result.domain}: ${statusText}${responseTime}${source}`);
        
        if (result.status === 'unknown' && result.httpStatus) {
          console.error(`  HTTP ${result.httpStatus}${result.errorCode ? `, Error ${result.errorCode}` : ''}`);
        }
      }
    } else {
      // Simple mode: just the status
      if (allDomains.length === 1) {
        // Single domain: output true/false
        const result = results[0];
        if (!result) {
          if (!options.quiet) {
            console.error('Error: No result returned for domain');
          }
          process.exit(2);
        }
        
        const available = result.status === 'available';
        
        if (!options.quiet) {
          console.log(available ? 'available' : result.status === 'registered' ? 'registered' : 'unknown');
        }
      } else {
        // Multiple domains: output each result
        for (const result of results) {
          if (!result) continue;
          const statusText = result.status === 'available' ? 'available' : 
                            result.status === 'registered' ? 'registered' : 'unknown';
          console.log(`${result.domain}: ${statusText}`);
        }
      }
    }

    // Set exit code based on overall status
    if (overallStatus === 'available') {
      process.exit(0); // All available
    } else if (overallStatus === 'registered' || overallStatus === 'mixed') {
      process.exit(1); // All registered or mixed results
    } else {
      process.exit(2); // Errors occurred
    }

  } catch (error) {
    if (!options.quiet) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
    process.exit(2);
  }
}
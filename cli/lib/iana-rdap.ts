interface IanaCache {
  timestamp: number;
  data: any;
}

let ianaCache: IanaCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchIanaBootstrap(): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch('https://data.iana.org/rdap/dns.json', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'dchk/0.1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`IANA bootstrap fetch failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get cached IANA RDAP bootstrap data or fetch fresh copy
 */
async function getIanaBootstrap(): Promise<any> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (ianaCache && (now - ianaCache.timestamp) < CACHE_TTL_MS) {
    return ianaCache.data;
  }

  // Fetch fresh data
  const data = await fetchIanaBootstrap();
  
  // Update cache
  ianaCache = {
    timestamp: now,
    data
  };

  return data;
}

/**
 * Extract TLD from domain
 */
function extractTld(domain: string): string | null {
  const parts = domain.toLowerCase().split('.');
  if (parts.length > 1) {
    const tld = parts[parts.length - 1];
    return tld || null;
  }
  return null;
}

/**
 * Find authoritative RDAP URL for a domain based on its TLD
 */
export async function getAuthoritativeRdapUrl(domain: string): Promise<string | null> {
  try {
    const tld = extractTld(domain);
    if (!tld) {
      return null;
    }

    const bootstrap = await getIanaBootstrap();
    
    // Find matching service in IANA bootstrap data
    // Format: [["tld1", "tld2"], ["https://rdap.example.com/", "https://backup.example.com/"]]
    const service = bootstrap.services?.find((svc: any) => {
      const tlds = svc[0];
      return Array.isArray(tlds) && tlds.includes(tld);
    });

    if (!service || !service[1] || !service[1][0]) {
      return null;
    }

    // Return the first (primary) RDAP URL
    return service[1][0] || null;
  } catch {
    return null;
  }
}

/**
 * Clear the IANA cache (useful for testing)
 */
export function clearIanaCache(): void {
  ianaCache = null;
}
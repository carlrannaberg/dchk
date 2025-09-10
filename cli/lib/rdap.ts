import type { Status, CheckResult, CheckOptions } from '../types/domain.js';

interface FetchResult {
  status: number;
  json: any;
  finalUrl: string;
  responseTimeMs: number;
}

function parseErrorCode(json: any): number | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const errorCode = json.errorCode;
  return typeof errorCode === 'number' ? errorCode : undefined;
}

async function fetchJson(url: string, timeoutMs: number): Promise<FetchResult> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      redirect: 'follow', // Handle 302 redirects automatically
      headers: { 
        'Accept': 'application/rdap+json',
        'User-Agent': 'dchk/0.1.0'
      },
      signal: abortController.signal
    });

    const responseTimeMs = Date.now() - startTime;
    const finalUrl = response.url; // URL after all redirects

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('json')) {
        json = await response.json();
      } else {
        // Try to parse as JSON even if content-type is wrong
        const text = await response.text();
        json = text ? JSON.parse(text) : null;
      }
    } catch {
      // Ignore JSON parsing errors, leave json = null
    }

    return {
      status: response.status,
      json,
      finalUrl,
      responseTimeMs
    };
  } finally {
    clearTimeout(timeout);
  }
}

function interpretRdapResponse(
  httpStatus: number,
  json: any
): { status: Status; errorCode?: number } {
  // HTTP 200 with valid JSON = registered
  if (httpStatus === 200 && json) {
    const errorCode = parseErrorCode(json);
    if (errorCode === 404) {
      return { status: 'available', errorCode };
    }
    return { status: 'registered' };
  }

  // HTTP 404 = available
  if (httpStatus === 404) {
    return { status: 'available', errorCode: 404 };
  }

  // Check for errorCode in JSON even with other HTTP status
  const errorCode = parseErrorCode(json);
  if (errorCode === 404) {
    return { status: 'available', errorCode };
  }

  // Everything else is unknown
  return { status: 'unknown', errorCode };
}

async function checkViaRdapOrg(
  domain: string,
  timeoutMs: number
): Promise<CheckResult> {
  try {
    const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    const result = await fetchJson(url, timeoutMs);
    const interpretation = interpretRdapResponse(result.status, result.json);

    return {
      domain,
      status: interpretation.status,
      httpStatus: result.status,
      errorCode: interpretation.errorCode,
      source: result.finalUrl === url ? 'rdap.org' : result.finalUrl,
      responseTimeMs: result.responseTimeMs
    };
  } catch (error) {
    return {
      domain,
      status: 'unknown',
      source: 'rdap.org',
      responseTimeMs: 0
    };
  }
}

async function checkViaAuthoritative(
  domain: string,
  timeoutMs: number
): Promise<CheckResult | null> {
  try {
    // Import IANA handler dynamically to avoid circular dependencies
    const { getAuthoritativeRdapUrl } = await import('./iana-rdap.js');
    const authUrl = await getAuthoritativeRdapUrl(domain);
    
    if (!authUrl) {
      return null;
    }

    const url = `${authUrl.replace(/\/$/, '')}/domain/${encodeURIComponent(domain)}`;
    const result = await fetchJson(url, timeoutMs);
    const interpretation = interpretRdapResponse(result.status, result.json);

    return {
      domain,
      status: interpretation.status,
      httpStatus: result.status,
      errorCode: interpretation.errorCode,
      source: authUrl,
      responseTimeMs: result.responseTimeMs
    };
  } catch {
    return null;
  }
}

/**
 * Check a single domain's availability via RDAP.
 * 
 * @param domain - Domain to check (e.g., "example.com")
 * @param options - Check options
 * @returns Promise resolving to check result
 */
export async function checkDomain(
  domain: string,
  options: CheckOptions = {}
): Promise<CheckResult> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const fallback = options.fallback ?? true;

  // 1. Try rdap.org first (aggregator with redirects)
  const primaryResult = await checkViaRdapOrg(domain, timeoutMs);
  
  // If we got a definitive answer (available or registered), return it
  if (primaryResult.status !== 'unknown') {
    return primaryResult;
  }

  // 2. Try authoritative RDAP fallback if enabled
  if (fallback) {
    const authResult = await checkViaAuthoritative(domain, timeoutMs);
    if (authResult && authResult.status !== 'unknown') {
      return authResult;
    }
  }

  // 3. Return the best result we have (probably unknown)
  return primaryResult;
}

/**
 * Validate domain format (basic check)
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= 253;
}
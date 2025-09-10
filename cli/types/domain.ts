export type Status = 'available' | 'registered' | 'unknown';

export interface CheckResult {
  domain: string;
  status: Status;
  httpStatus?: number;
  errorCode?: number;
  source?: string; // Final URL after redirects
  responseTimeMs?: number;
}

export interface CheckOptions {
  timeoutMs?: number; // default: 5000
  fallback?: boolean; // default: true
}

export interface DomainCommandOptions {
  timeout?: number;
  concurrency?: number;
  verbose?: boolean;
  quiet?: boolean;
  fallback?: boolean;
}
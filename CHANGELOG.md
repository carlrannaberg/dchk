# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-09-10

### Added
- **UNIX-Style Domain Availability Checker**: Complete implementation of modern domain checking tool using RDAP protocol
  - Simple CLI interface: `dchk example.com` for single domain checks
  - Proper UNIX exit codes: 0=available, 1=registered, 2=error for shell scripting integration
  - Batch processing support with concurrent domain checking (configurable concurrency limits)
  - Stdin input support for pipeline operations (`cat domains.txt | dchk`)
  - Verbose output mode with table formatting showing response times and authoritative sources
- **RDAP Protocol Implementation**: Modern domain checking with comprehensive fallback system
  - Primary queries to rdap.org aggregator with automatic redirect following
  - Authoritative RDAP server fallback using IANA bootstrap protocol
  - HTTP 302 redirect handling and proper response interpretation
  - Configurable timeout support (default 5000ms) with graceful error handling
  - Smart status interpretation: HTTP 200=registered, HTTP 404=available, with JSON error code support
- **Concurrent Processing System**: High-performance batch domain checking
  - Configurable concurrency limits (default 10 concurrent requests)
  - Result ordering preservation for predictable output
  - Individual domain timeout handling without affecting other requests
  - Memory-efficient processing for large domain lists
- **Comprehensive CLI Options**: Full-featured command-line interface
  - `--verbose` flag for detailed output with response times and sources
  - `--quiet` flag for silent operation (exit codes only)
  - `--concurrency <number>` for concurrent request tuning
  - `--timeout <number>` for request timeout configuration
  - `--no-fallback` to disable authoritative RDAP fallback
- **Advanced Output Formatting**: Clean, scriptable output for automation
  - Simple mode: `available`/`registered`/`unknown` for single domains
  - Multi-domain mode: `domain.com: available` format for batch results
  - Verbose table mode with aligned columns (DOMAIN, STATUS, TIME, SOURCE)
  - Dynamic column width calculation for optimal display formatting
- **Domain Validation System**: Robust input validation and error handling
  - RFC-compliant domain name validation with proper TLD requirements
  - Invalid domain detection with helpful error messages
  - Empty input handling with usage guidance
  - Graceful error handling for network issues and timeouts
- **IANA Bootstrap Integration**: Authoritative RDAP server discovery
  - Automatic TLD-to-RDAP-server mapping using IANA bootstrap data
  - 1-hour intelligent caching to reduce bootstrap API calls
  - Fallback to rdap.org when authoritative servers are unavailable
  - Proper error handling for bootstrap service failures
- **Library Usage Support**: Programmatic API for integration
  - `checkDomain(domain, options)` function for single domain checks
  - `isValidDomain(domain)` utility for domain format validation
  - TypeScript support with comprehensive type definitions
  - ESM module support with proper export structure

### Changed
- **Build System**: Modern TypeScript build pipeline with ESM support
  - ESBuild-based compilation for fast development and production builds
  - TypeScript to CommonJS output for maximum Node.js compatibility
  - Comprehensive build validation and dependency checking
  - Production-ready npm packaging configuration
- **Testing Infrastructure**: Comprehensive test suite with 113 test cases
  - Unit tests for core RDAP functionality and domain validation
  - Integration tests for CLI behavior and option handling
  - End-to-end tests with real network requests for full validation
  - Vitest framework with proper timeout handling for network operations
  - Mock system for reliable unit testing without network dependencies

### Fixed
- **Domain Validation**: Enhanced validation to require TLD (reject single words)
- **RDAP Response Interpretation**: Proper HTTP 200 handling (always registered even with null JSON)
- **Table Formatting**: Safe URL hostname extraction to prevent parsing errors
- **Test Suite**: All 113 tests passing with proper table format expectations
- **Security**: Removed sensitive `.claude/settings.local.json` from git tracking

### Security
- **Git Configuration**: Added `.claude/settings.local.json` to .gitignore for user privacy
- **Input Validation**: Comprehensive domain format validation to prevent malformed requests
- **Error Handling**: Secure error messages that don't expose internal implementation details
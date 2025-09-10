# dchk (domain availability check)

A fast, UNIX-style domain availability checker using the RDAP protocol.

## Overview

`dchk` is a command-line tool for checking domain name availability using the Registration Data Access Protocol (RDAP). It provides clean, scriptable output with proper UNIX exit codes, making it perfect for automation and batch processing.

## Features

- **RDAP Protocol**: Uses modern RDAP instead of deprecated WHOIS
- **Authoritative Sources**: Queries authoritative RDAP servers directly
- **Concurrent Processing**: Check multiple domains simultaneously
- **UNIX-Style**: Proper exit codes and clean output for scripting
- **Flexible Input**: Command-line arguments or stdin pipeline
- **Detailed Output**: Optional verbose mode with response times and sources
- **Timeout Handling**: Configurable timeouts with graceful error handling

## Installation

### From npm

```bash
npm install -g dchk
```

## Usage

### Basic Usage

Check a single domain:
```bash
dchk example.com
# Output: available
# Exit code: 0 (available) or 1 (registered)
```

Check multiple domains:
```bash
dchk google.com facebook.com nonexistent123.com
# Output:
# google.com: registered
# facebook.com: registered
# nonexistent123.com: available
```

### Verbose Output

Get detailed information with response times and sources:
```bash
dchk --verbose google.com facebook.com nonexistent123.com
# Output:
# DOMAIN       STATUS      TIME   SOURCE
# ────────────────────────────────────────────
# google.com   REGISTERED  634ms  rdap.verisign.com
# facebook.com REGISTERED  521ms  rdap.verisign.com
# nonexistent123.com     AVAILABLE   387ms  rdap.org
```

### Stdin Input

Process domains from stdin:
```bash
echo "example.com" | dchk
cat domains.txt | dchk --verbose
echo "google.com facebook.com" | tr ' ' '\n' | dchk
```

### Shell Scripting

Use exit codes for conditional logic:
```bash
if dchk mydomain.com; then
    echo "Domain is available!"
else
    echo "Domain is taken or error occurred"
fi
```

## Command Line Options

```
Usage: dchk [options] [domains...]

UNIX-style domain availability checker (RDAP-first)

Arguments:
  domains                     domain names to check (also reads from stdin)

Options:
  -V, --version               output the version number
  -v, --verbose               enable verbose output with response times and sources
  -q, --quiet                 suppress non-error output
  -c, --concurrency <number>  maximum concurrent checks (default: "10")
  -t, --timeout <number>      request timeout in milliseconds (default: "5000")
  --no-fallback               disable authoritative RDAP fallback
  -h, --help                  display help for command
```

## Exit Codes

Following UNIX conventions:

- **0**: Domain is available (success)
- **1**: Domain is registered (failure) 
- **2**: Error occurred (invalid domain, network error, etc.)

## Examples

### Check Domain Availability
```bash
dchk example.com
# available (exit code 0)

dchk google.com  
# registered (exit code 1)
```

### Batch Processing
```bash
# From file
cat domains.txt | dchk --verbose --concurrency 5

# From command line
dchk domain1.com domain2.com domain3.com --verbose

# Mixed with timeout
dchk --timeout 3000 --verbose example.com test.com
```

### Automation Scripts
```bash
#!/bin/bash
# Check if domain is available before proceeding
if dchk "$1" >/dev/null 2>&1; then
    echo "Domain $1 is available - proceeding with registration"
    # registration logic here
else
    echo "Domain $1 is not available"
    exit 1
fi
```

### Performance Testing
```bash
# Test with high concurrency
echo "google.com facebook.com twitter.com github.com" | \
tr ' ' '\n' | \
dchk --verbose --concurrency 10 --timeout 2000
```

## Output Formats

### Simple Mode (Default)
```
available
registered
unknown
```

### Multiple Domains
```
domain1.com: available
domain2.com: registered
domain3.com: unknown
```

### Verbose Mode
```
DOMAIN       STATUS      TIME   SOURCE
────────────────────────────────────────────
domain1.com  AVAILABLE   234ms  rdap.org
domain2.com  REGISTERED  456ms  rdap.verisign.com
```

## RDAP Protocol

`dchk` uses the Registration Data Access Protocol (RDAP), the modern successor to WHOIS:

- **Structured Data**: JSON responses instead of unstructured text
- **Standardized**: Consistent format across registries
- **Authoritative**: Queries official registry sources
- **Reliable**: Better error handling and status codes

The tool automatically:
1. Queries `rdap.org` as the primary source
2. Falls back to authoritative RDAP servers via IANA bootstrap
3. Follows HTTP redirects to reach the correct endpoints
4. Handles rate limiting and timeout scenarios

## Development

### Requirements
- Node.js >= 20.0.0
- npm or yarn

### Setup
```bash
git clone https://github.com/carlrannaberg/dchk.git
cd dchk
npm install
```

### Build
```bash
npm run build        # Build for production
npm run build:watch  # Build and watch for changes
```

### Testing
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only
```

### Project Structure
```
├── cli/
│   ├── commands/          # Command implementations
│   ├── lib/               # Core RDAP functionality
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── dist/                  # Built output
```

## Library Usage

`dchk` can also be used as a library:

```javascript
import { checkDomain, isValidDomain } from 'dchk';

// Check single domain
const result = await checkDomain('example.com');
console.log(result.status); // 'available', 'registered', or 'unknown'

// Validate domain format
if (isValidDomain('example.com')) {
    // proceed with check
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality  
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Tools

- `whois` - Traditional WHOIS client
- `dig` - DNS lookup utility  
- `nslookup` - DNS query tool
- `host` - DNS lookup utility

`dchk` complements these tools by providing modern RDAP-based domain availability checking with clean, automatable output.
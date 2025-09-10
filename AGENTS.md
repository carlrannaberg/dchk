# AGENTS.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md, .clinerules, .cursorrules, .windsurfrules, .replit.md, GEMINI.md, and other AI config files are symlinks to AGENTS.md in this project.

# dchk

A TypeScript CLI tool for development workflow automation. Built with commander.js, this tool provides commands to check and manage development environments with colorized output and comprehensive status reporting.

## Build & Commands

**Development Commands:**
- Build: `npm run build` - Complete build (clean + main + esm + types)
- Build main: `npm run build:main` - Bundle CLI with esbuild to CommonJS
- Build library: `npm run build:esm` - Bundle index exports with esbuild
- Build types: `npm run build:types` - Generate TypeScript declarations
- Clean: `npm run clean` - Remove dist directory
- Dev mode: `npm run dev` - Development server with tsx watch mode

**Testing Commands:**
- Test: `npm test` - Run all tests with vitest
- Test watch: `npm run test:watch` - Run tests in watch mode
- Test coverage: `npm run test:coverage` - Run tests with coverage reporting

**Code Quality Commands:**
- Type check: `npm run typecheck` - TypeScript type checking without emit
- Lint: `npm run lint` - ESLint on TypeScript files
- Format: `npm run format` - Format code with Prettier
- Format check: `npm run format:check` - Check code formatting without changes

**CLI Commands:**
- Status: `./bin/dchk status` - Check development tools and project structure
- Status verbose: `./bin/dchk status --verbose` - Detailed status with troubleshooting
- Help: `./bin/dchk --help` - Show available commands and options
- Version: `./bin/dchk --version` - Show CLI version

### Script Command Consistency
**Important**: When modifying npm scripts in package.json, ensure all references are updated:
- GitHub Actions workflows (.github/workflows/*.yml)
- README.md documentation
- Contributing guides
- Dockerfile/docker-compose.yml
- CI/CD configuration files
- Setup/installation scripts

**Note**: Always use the EXACT script names from package.json, not assumed names

## Code Style

### Language & Framework
- **TypeScript**: ES2022 target with strict configuration
- **Module System**: ESM (ES Modules) with bundler resolution
- **Node.js**: Minimum version 20.0.0
- **CLI Framework**: Commander.js v14.0.0

### Import Conventions
```typescript
// Use .js extensions in imports (required for ESM)
import { Logger } from './utils/logger.js';
import { colors } from './utils/colors.js';

// Path mapping: @/* resolves to cli/*
import { Logger } from '@/utils/logger.js';

// Dynamic imports for commands (performance)
const { status } = await import('./commands/status.js');
```

### Formatting Rules
- **Indentation**: 2 spaces (configured in tsconfig.json)
- **Line Length**: No strict limit, but aim for readability
- **Semicolons**: Always use semicolons
- **Quotes**: Single quotes preferred, double quotes for strings containing singles
- **Trailing Commas**: Use for multiline objects/arrays

### Naming Conventions
- **Files**: kebab-case (`status.ts`, `logger.ts`)
- **Classes**: PascalCase (`Logger`, `StatusChecker`)
- **Functions**: camelCase (`runCli`, `checkTool`)
- **Constants**: SCREAMING_SNAKE_CASE (`LOG_LEVEL`)
- **Interfaces**: PascalCase with descriptive names (`GlobalOptions`, `StatusOptions`)

### Type Usage Patterns
```typescript
// Strict typing required
interface GlobalOptions {
  verbose?: boolean | undefined;
  quiet?: boolean | undefined;
  dryRun?: boolean | undefined;
}

// Union types for enums
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Proper error handling
catch (error) {
  logger.error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
}
```

### Error Handling Patterns
- Use try/catch blocks for async operations
- Provide meaningful error messages with context
- Exit with proper codes: `process.exit(1)` for errors
- Log errors using the Logger utility with appropriate levels
- Handle both Error objects and unknown error types

### Utility Usage
- **Colors**: Use `picocolors` for performance, `chalk` for advanced styling
- **Logging**: Use Logger class with configurable levels (debug, info, warn, error, success)
- **File Operations**: Use `fs-extra` for enhanced filesystem operations

## Testing

### Framework & Setup
- **Framework**: Vitest (modern Vite-based test runner)
- **Configuration**: TypeScript-first with ES modules
- **File Patterns**: `**/*.test.*`, `**/*.spec.*`
- **Coverage**: Built-in coverage reporting with vitest

### Testing Conventions
```typescript
// Test file naming: [module].test.ts
// Example: logger.test.ts, status.test.ts

import { describe, it, expect } from 'vitest';
import { Logger } from '../src/utils/logger.js';

describe('Logger', () => {
  it('should log info messages', () => {
    // Test implementation
  });
});
```

### Testing Philosophy
**When tests fail, fix the code, not the test.**

Key principles:
- **Tests should be meaningful** - Avoid tests that always pass regardless of behavior
- **Test actual functionality** - Call the functions being tested, don't just check side effects  
- **Failing tests are valuable** - They reveal bugs or missing features
- **Fix the root cause** - When a test fails, fix the underlying issue, don't hide the test
- **Test edge cases** - Tests that reveal limitations help improve the code
- **Document test purpose** - Each test should include a comment explaining why it exists and what it validates

### Test Execution
- **All tests**: `npm test`
- **Watch mode**: `npm run test:watch` 
- **Coverage**: `npm run test:coverage`
- **Single test**: `npx vitest run [test-file-pattern]`

## Security

### Data Protection
- **No secrets in code** - Never commit API keys, tokens, or passwords
- **Environment variables** - Use .env files for sensitive configuration
- **Input validation** - Validate all user inputs and command arguments
- **Command injection** - Sanitize inputs passed to shell commands

### CLI Security Patterns
```typescript
// Safe command execution
import { execSync } from 'child_process';

try {
  const output = execSync(command, { 
    encoding: 'utf8', 
    stdio: 'pipe',
    timeout: 5000 // Prevent hanging
  });
} catch (error) {
  // Handle execution errors safely
}
```

### Best Practices
- Use timeouts for external command execution
- Validate file paths to prevent directory traversal
- Handle errors gracefully without exposing system information
- Log security-relevant events appropriately

## Directory Structure & File Organization

### Reports Directory
ALL project reports and documentation should be saved to the `reports/` directory:

```
dchk/
├── reports/              # All project reports and documentation
│   └── *.md             # Various report types
├── temp/                # Temporary files and debugging
├── cli/                 # Source code
├── bin/                 # Executable scripts
├── dist/                # Build output
└── [other directories]
```

### Report Generation Guidelines
**Important**: ALL reports should be saved to the `reports/` directory with descriptive names:

**Implementation Reports:**
- Phase validation: `PHASE_X_VALIDATION_REPORT.md`
- Implementation summaries: `IMPLEMENTATION_SUMMARY_[FEATURE].md`
- Feature completion: `FEATURE_[NAME]_REPORT.md`

**Testing & Analysis Reports:**
- Test results: `TEST_RESULTS_[DATE].md`
- Coverage reports: `COVERAGE_REPORT_[DATE].md`
- Performance analysis: `PERFORMANCE_ANALYSIS_[SCENARIO].md`
- Security scans: `SECURITY_SCAN_[DATE].md`

**Quality & Validation:**
- Code quality: `CODE_QUALITY_REPORT.md`
- Dependency analysis: `DEPENDENCY_REPORT.md`
- API compatibility: `API_COMPATIBILITY_REPORT.md`

**Report Naming Conventions:**
- Use descriptive names: `[TYPE]_[SCOPE]_[DATE].md`
- Include dates: `YYYY-MM-DD` format
- Group with prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Markdown format: All reports end in `.md`

### Temporary Files & Debugging
All temporary files, debugging scripts, and test artifacts should be organized in a `/temp` folder:

**Temporary File Organization:**
- **Debug scripts**: `temp/debug-*.js`, `temp/analyze-*.py`
- **Test artifacts**: `temp/test-results/`, `temp/coverage/`
- **Generated files**: `temp/generated/`, `temp/build-artifacts/`
- **Logs**: `temp/logs/debug.log`, `temp/logs/error.log`

**Guidelines:**
- Never commit files from `/temp` directory
- Use `/temp` for all debugging and analysis scripts created during development
- Clean up `/temp` directory regularly or use automated cleanup
- Include `/temp/` in `.gitignore` to prevent accidental commits

### Claude Code Settings (.claude Directory)

The `.claude` directory contains Claude Code configuration files with specific version control rules:

#### Version Controlled Files (commit these):
- `.claude/settings.json` - Shared team settings for hooks, tools, and environment
- `.claude/commands/*.md` - Custom slash commands available to all team members
- `.claude/hooks/*.sh` - Hook scripts for automated validations and actions

#### Ignored Files (do NOT commit):
- `.claude/settings.local.json` - Personal preferences and local overrides
- Any `*.local.json` files - Personal configuration not meant for sharing

**Important Notes:**
- Claude Code automatically adds `.claude/settings.local.json` to `.gitignore`
- The shared `settings.json` should contain team-wide standards (linting, type checking, etc.)
- Personal preferences or experimental settings belong in `settings.local.json`
- Hook scripts in `.claude/hooks/` should be executable (`chmod +x`)

## Configuration

### Environment Setup
- **Node.js**: Version ≥20.0.0 required
- **Package Manager**: npm (package-lock.json committed)
- **TypeScript**: Configured for ES2022 with strict checking
- **ESBuild**: Fast bundling to CommonJS for Node.js compatibility

### Build Configuration
```json
{
  "target": "ES2022",
  "moduleResolution": "bundler", 
  "strict": true,
  "outDir": "./dist",
  "sourceMaps": true
}
```

### Development Environment
- **Dev Server**: `npm run dev` - tsx watch mode
- **Type Checking**: Real-time with VS Code TypeScript extension
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style

### Dependencies & Versions
**Critical Dependencies:**
- `commander@^14.0.0` - CLI argument parsing
- `chalk@^5.4.1` - Advanced terminal styling
- `picocolors@^1.1.0` - Performance-focused colors
- `fs-extra@^11.3.0` - Enhanced filesystem operations

## Agent Delegation & Tool Execution

### ⚠️ MANDATORY: Always Delegate to Specialists & Execute in Parallel

**When specialized agents are available, you MUST use them instead of attempting tasks yourself.**

**When performing multiple operations, send all tool calls (including Task calls for agent delegation) in a single message to execute them concurrently for optimal performance.**

#### Why Agent Delegation Matters:
- Specialists have deeper, more focused knowledge
- They're aware of edge cases and subtle bugs  
- They follow established patterns and best practices
- They can provide more comprehensive solutions

#### Key Principles:
- **Agent Delegation**: Always check if a specialized agent exists for your task domain
- **Complex Problems**: Delegate to domain experts, use diagnostic agents when scope is unclear
- **Multiple Agents**: Send multiple Task tool calls in a single message to delegate to specialists in parallel
- **DEFAULT TO PARALLEL**: Unless you have a specific reason why operations MUST be sequential (output of A required for input of B), always execute multiple tools simultaneously
- **Plan Upfront**: Think "What information do I need to fully answer this question?" Then execute all searches together

#### Discovering Available Agents:
```bash
# Quick check: List agents if claudekit is installed
command -v claudekit >/dev/null 2>&1 && claudekit list agents || echo "claudekit not installed"

# If claudekit is installed, you can explore available agents:
claudekit list agents
```

#### Critical: Always Use Parallel Tool Calls

**Err on the side of maximizing parallel tool calls rather than running sequentially.**

**IMPORTANT: Send all tool calls in a single message to execute them in parallel.**

**These cases MUST use parallel tool calls:**
- Searching for different patterns (imports, usage, definitions)
- Multiple grep searches with different regex patterns
- Reading multiple files or searching different directories
- Combining Glob with Grep for comprehensive results
- Searching for multiple independent concepts with codebase_search_agent
- Any information gathering where you know upfront what you're looking for
- Agent delegations with multiple Task calls to different specialists

**Sequential calls ONLY when:**
You genuinely REQUIRE the output of one tool to determine the usage of the next tool.

**Planning Approach:**
1. Before making tool calls, think: "What information do I need to fully answer this question?"
2. Send all tool calls in a single message to execute them in parallel
3. Execute all those searches together rather than waiting for each result
4. Most of the time, parallel tool calls can be used rather than sequential

**Performance Impact:** Parallel tool execution is 3-5x faster than sequential calls, significantly improving user experience.

**Remember:** This is not just an optimization—it's the expected behavior. Both delegation and parallel execution are requirements, not suggestions.

## Git Commit Conventions
Based on analysis of this project's git history:
- **Format**: Simple descriptive messages
- **Tense**: Imperative mood (e.g., "Add feature", "Fix bug", "Update documentation")
- **Length**: Concise subject line (typically under 60 characters)
- **No ticket codes or prefixes required**
- **Focus on what the commit accomplishes**

Examples:
- "Initial commit"
- "Set up CLI infrastructure with commander.js"
- "Add status command for development tools"
- "Fix build configuration issues"

## Architecture Notes

### CLI Structure
- **Entry Point**: `cli/cli.ts` - Main commander.js setup
- **Commands**: `cli/commands/*.ts` - Individual command implementations
- **Utilities**: `cli/utils/*.ts` - Shared utilities (logger, colors)
- **Library**: `cli/index.ts` - Exports for programmatic use

### Build System
- **Dual Output**: CLI (.cjs) and library exports
- **Bundling**: esbuild for fast compilation
- **Types**: Separate TypeScript declaration generation
- **Compatibility**: CommonJS output for Node.js compatibility

### Extensibility
- **Adding Commands**: Create files in `cli/commands/` and register in `cli/cli.ts`
- **Global Options**: Handled in main CLI setup with hook system
- **Utility Functions**: Add to appropriate modules in `cli/utils/`
- **Error Handling**: Consistent pattern with Logger utility
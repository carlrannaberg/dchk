import { Logger } from '../utils/logger.js';
import { colors, status as statusHelpers } from '../utils/colors.js';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface StatusOptions {
  verbose?: boolean;
  quiet?: boolean;
}

const logger = new Logger();

interface ToolCheck {
  name: string;
  command: string;
  description: string;
  optional?: boolean;
}

const tools: ToolCheck[] = [
  {
    name: 'Node.js',
    command: 'node --version',
    description: 'JavaScript runtime',
  },
  {
    name: 'npm',
    command: 'npm --version',
    description: 'Package manager',
  },
  {
    name: 'Git',
    command: 'git --version',
    description: 'Version control system',
  },
  {
    name: 'TypeScript',
    command: 'npx tsc --version',
    description: 'TypeScript compiler',
    optional: true,
  },
];

function checkTool(tool: ToolCheck): { available: boolean; version?: string; error?: string } {
  try {
    const output = execSync(tool.command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 5000 
    });
    return {
      available: true,
      version: output.trim(),
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkProjectFiles(): { packageJson: boolean; tsconfig: boolean; gitRepo: boolean } {
  return {
    packageJson: existsSync('package.json'),
    tsconfig: existsSync('tsconfig.json'),
    gitRepo: existsSync('.git'),
  };
}

export async function status(options: StatusOptions = {}): Promise<void> {
  if (options.verbose) {
    logger.setLevel('debug');
  } else if (options.quiet) {
    logger.setLevel('error');
  }

  logger.info('Checking development tool status...\n');

  // Check tools
  console.log(colors.bold('📦 Development Tools'));
  console.log('─'.repeat(40));

  const results = tools.map(tool => ({
    tool,
    result: checkTool(tool),
  }));

  for (const { tool, result } of results) {
    const status = result.available 
      ? statusHelpers.success(`${tool.name}`)
      : tool.optional 
        ? statusHelpers.warning(`${tool.name} (optional)`)
        : statusHelpers.error(`${tool.name}`);
    
    const version = result.version ? colors.dim(` ${result.version}`) : '';
    const description = colors.muted(` - ${tool.description}`);
    
    console.log(`${status}${version}${description}`);
    
    if (!result.available && result.error && options.verbose) {
      console.log(`  ${colors.dim(`Error: ${result.error}`)}`);
    }
  }

  // Check project structure
  console.log(`\n${colors.bold('📁 Project Structure')}`);
  console.log('─'.repeat(40));

  const projectFiles = checkProjectFiles();
  
  console.log(projectFiles.packageJson 
    ? statusHelpers.success('package.json') + colors.muted(' - Project configuration')
    : statusHelpers.error('package.json') + colors.muted(' - Missing project configuration')
  );
  
  console.log(projectFiles.tsconfig 
    ? statusHelpers.success('tsconfig.json') + colors.muted(' - TypeScript configuration')
    : statusHelpers.info('tsconfig.json') + colors.muted(' - No TypeScript configuration')
  );
  
  console.log(projectFiles.gitRepo 
    ? statusHelpers.success('Git repository') + colors.muted(' - Version control initialized')
    : statusHelpers.warning('Git repository') + colors.muted(' - No version control')
  );

  // Summary
  const criticalIssues = results.filter(({ tool, result }) => !result.available && !tool.optional).length;
  
  if (criticalIssues === 0) {
    console.log(`\n${statusHelpers.success('All critical tools are available!')}`);
  } else {
    console.log(`\n${statusHelpers.error(`${criticalIssues} critical tool(s) missing`)}`);
  }

  if (options.verbose) {
    console.log(`\n${colors.dim('Use --help for available commands')}`);
  }
}
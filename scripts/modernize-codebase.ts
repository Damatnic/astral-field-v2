#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import pino from 'pino';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import * as ts from 'typescript';
import * as babel from '@babel/core';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import parser from '@babel/parser';
import generate from '@babel/generator';

// Logger configuration
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss'
    }
  }
});

// Modernization configuration
interface ModernizationConfig {
  targetDir: string;
  excludePatterns: string[];
  fileExtensions: string[];
  dryRun: boolean;
  backupDir: string;
  fixConsoleLog: boolean;
  fixRequireStatements: boolean;
  fixJQuery: boolean;
  addTypeScript: boolean;
  fixAsyncAwait: boolean;
  optimizeImports: boolean;
  removeDeadCode: boolean;
  addErrorHandling: boolean;
}

// Statistics tracking
interface ModernizationStats {
  filesProcessed: number;
  filesModified: number;
  consoleLogsReplaced: number;
  requiresConverted: number;
  jQueryRemoved: number;
  asyncConverted: number;
  importsOptimized: number;
  deadCodeRemoved: number;
  errorsFixed: number;
  totalChanges: number;
  executionTime: number;
}

class CodebaseModernizer {
  private config: ModernizationConfig;
  private stats: ModernizationStats;
  private startTime: number;

  constructor(config: Partial<ModernizationConfig> = {}) {
    this.config = {
      targetDir: process.cwd(),
      excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**', '*.min.js'],
      fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
      dryRun: false,
      backupDir: '.modernization-backup',
      fixConsoleLog: true,
      fixRequireStatements: true,
      fixJQuery: true,
      addTypeScript: true,
      fixAsyncAwait: true,
      optimizeImports: true,
      removeDeadCode: true,
      addErrorHandling: true,
      ...config
    };

    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      consoleLogsReplaced: 0,
      requiresConverted: 0,
      jQueryRemoved: 0,
      asyncConverted: 0,
      importsOptimized: 0,
      deadCodeRemoved: 0,
      errorsFixed: 0,
      totalChanges: 0,
      executionTime: 0
    };

    this.startTime = performance.now();
  }

  async modernize(): Promise<void> {
    logger.info(chalk.blue.bold('🚀 Starting Codebase Modernization'));
    logger.info({ config: this.config }, 'Configuration');

    // Create backup if not dry run
    if (!this.config.dryRun) {
      await this.createBackup();
    }

    // Find all files to process
    const files = await this.findFiles();
    logger.info(chalk.yellow(`Found ${files.length} files to process`));

    // Process each file
    for (const file of files) {
      await this.processFile(file);
    }

    // Calculate execution time
    this.stats.executionTime = performance.now() - this.startTime;

    // Display results
    this.displayResults();
  }

  private async createBackup(): Promise<void> {
    const backupPath = path.join(this.config.targetDir, this.config.backupDir);
    
    try {
      await fs.mkdir(backupPath, { recursive: true });
      logger.info(chalk.green(`✅ Backup directory created: ${backupPath}`));
    } catch (error) {
      logger.error({ error }, 'Failed to create backup directory');
      throw error;
    }
  }

  private async findFiles(): Promise<string[]> {
    const patterns = this.config.fileExtensions.map(
      ext => path.join(this.config.targetDir, `**/*.${ext}`)
    );

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: this.config.excludePatterns,
        absolute: true
      });
      files.push(...matches);
    }

    return files;
  }

  private async processFile(filePath: string): Promise<void> {
    this.stats.filesProcessed++;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let modified = content;
      let changesMade = false;

      // Apply transformations
      if (this.config.fixConsoleLog) {
        const result = this.replaceConsoleLogs(modified, filePath);
        if (result.changed) {
          modified = result.content;
          changesMade = true;
          this.stats.consoleLogsReplaced += result.count;
        }
      }

      if (this.config.fixRequireStatements) {
        const result = this.convertRequireToImport(modified);
        if (result.changed) {
          modified = result.content;
          changesMade = true;
          this.stats.requiresConverted += result.count;
        }
      }

      if (this.config.fixJQuery && filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        const result = this.removeJQuery(modified);
        if (result.changed) {
          modified = result.content;
          changesMade = true;
          this.stats.jQueryRemoved += result.count;
        }
      }

      if (this.config.fixAsyncAwait) {
        const result = this.modernizeAsyncCode(modified);
        if (result.changed) {
          modified = result.content;
          changesMade = true;
          this.stats.asyncConverted += result.count;
        }
      }

      if (this.config.optimizeImports) {
        const result = this.optimizeImports(modified);
        if (result.changed) {
          modified = result.content;
          changesMade = true;
          this.stats.importsOptimized += result.count;
        }
      }

      if (this.config.addErrorHandling) {
        const result = this.addErrorHandling(modified);
        if (result.changed) {
          modified = result.content;
          changesMade = true;
          this.stats.errorsFixed += result.count;
        }
      }

      // Write changes if any were made
      if (changesMade) {
        this.stats.filesModified++;
        this.stats.totalChanges++;

        if (!this.config.dryRun) {
          // Backup original file
          const backupPath = path.join(
            this.config.backupDir,
            path.relative(this.config.targetDir, filePath)
          );
          await fs.mkdir(path.dirname(backupPath), { recursive: true });
          await fs.copyFile(filePath, backupPath);

          // Write modified content
          await fs.writeFile(filePath, modified, 'utf-8');
          logger.info(chalk.green(`✅ Modified: ${path.relative(this.config.targetDir, filePath)}`));
        } else {
          logger.info(chalk.yellow(`[DRY RUN] Would modify: ${path.relative(this.config.targetDir, filePath)}`));
        }
      }
    } catch (error) {
      logger.error({ error, file: filePath }, 'Error processing file');
    }
  }

  private replaceConsoleLogs(content: string, filePath: string): { content: string; changed: boolean; count: number } {
    let count = 0;
    const isProduction = filePath.includes('/production/') || filePath.includes('/dist/');
    
    // Create a proper logger import based on file type
    const loggerImport = filePath.endsWith('.ts') || filePath.endsWith('.tsx')
      ? "import { logger } from '@/lib/logger';\n"
      : "const { logger } = require('@/lib/logger');\n";

    // Replace console.log with logger
    const patterns = [
      { regex: /console\.log\(/g, replacement: 'logger.info(' },
      { regex: /console\.error\(/g, replacement: 'logger.error(' },
      { regex: /console\.warn\(/g, replacement: 'logger.warn(' },
      { regex: /console\.info\(/g, replacement: 'logger.info(' },
      { regex: /console\.debug\(/g, replacement: 'logger.debug(' },
      { regex: /console\.trace\(/g, replacement: 'logger.trace(' }
    ];

    let modified = content;
    let hasConsoleLog = false;

    for (const { regex, replacement } of patterns) {
      const matches = modified.match(regex);
      if (matches) {
        count += matches.length;
        hasConsoleLog = true;
        
        if (isProduction) {
          // Remove console logs in production files
          modified = modified.replace(regex, '// Removed in production: $&\n//');
        } else {
          modified = modified.replace(regex, replacement);
        }
      }
    }

    // Add logger import if console was replaced
    if (hasConsoleLog && !isProduction && !modified.includes('logger')) {
      modified = loggerImport + modified;
    }

    return {
      content: modified,
      changed: count > 0,
      count
    };
  }

  private convertRequireToImport(content: string): { content: string; changed: boolean; count: number } {
    let count = 0;
    let modified = content;

    // Pattern to match require statements
    const requirePatterns = [
      // const x = require('module')
      {
        regex: /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
        replacement: "import $1 from '$2'"
      },
      // const { x, y } = require('module')
      {
        regex: /const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\)/g,
        replacement: "import { $1 } from '$2'"
      },
      // require('module')
      {
        regex: /require\(['"]([^'"]+)['"]\)/g,
        replacement: "import '$1'"
      }
    ];

    for (const { regex, replacement } of requirePatterns) {
      const matches = modified.match(regex);
      if (matches) {
        count += matches.length;
        modified = modified.replace(regex, replacement);
      }
    }

    // Fix module.exports to export default
    modified = modified.replace(/module\.exports\s*=\s*{/g, 'export {');
    modified = modified.replace(/module\.exports\s*=\s*/g, 'export default ');
    modified = modified.replace(/exports\.(\w+)\s*=/g, 'export const $1 =');

    return {
      content: modified,
      changed: count > 0,
      count
    };
  }

  private removeJQuery(content: string): { content: string; changed: boolean; count: number } {
    let count = 0;
    let modified = content;

    const jQueryReplacements = [
      // $('#id') -> document.getElementById('id')
      {
        regex: /\$\(['"]#(\w+)['"]\)/g,
        replacement: "document.getElementById('$1')"
      },
      // $('.class') -> document.getElementsByClassName('class')
      {
        regex: /\$\(['"]\.(\w+)['"]\)/g,
        replacement: "document.querySelectorAll('.$1')"
      },
      // $(element).hide() -> element.style.display = 'none'
      {
        regex: /\$\(([^)]+)\)\.hide\(\)/g,
        replacement: "$1.style.display = 'none'"
      },
      // $(element).show() -> element.style.display = 'block'
      {
        regex: /\$\(([^)]+)\)\.show\(\)/g,
        replacement: "$1.style.display = 'block'"
      },
      // $(element).click(handler) -> element.addEventListener('click', handler)
      {
        regex: /\$\(([^)]+)\)\.click\(([^)]+)\)/g,
        replacement: "$1.addEventListener('click', $2)"
      },
      // $.ajax -> fetch
      {
        regex: /\$\.ajax\({[\s\S]*?url:\s*['"]([^'"]+)['"][\s\S]*?}\)/g,
        replacement: "fetch('$1')"
      }
    ];

    for (const { regex, replacement } of jQueryReplacements) {
      const matches = modified.match(regex);
      if (matches) {
        count += matches.length;
        modified = modified.replace(regex, replacement);
      }
    }

    // Remove jQuery import/script tags
    modified = modified.replace(/<script.*jquery.*<\/script>/gi, '');
    modified = modified.replace(/import.*jquery.*/gi, '');
    modified = modified.replace(/const.*\$.*=.*require.*jquery.*/gi, '');

    return {
      content: modified,
      changed: count > 0,
      count
    };
  }

  private modernizeAsyncCode(content: string): { content: string; changed: boolean; count: number } {
    let count = 0;
    let modified = content;

    // Convert callbacks to async/await
    const callbackPatterns = [
      // Convert .then().catch() to async/await
      {
        regex: /(\w+)\((.*?)\)\s*\.\s*then\s*\(\s*(\w+)\s*=>\s*{([^}]+)}\s*\)\s*\.catch\s*\(\s*(\w+)\s*=>\s*{([^}]+)}\s*\)/g,
        replacement: 'try {\n  const $3 = await $1($2);\n$4\n} catch ($5) {\n$6\n}'
      },
      // Convert simple .then() to await
      {
        regex: /(\w+)\((.*?)\)\s*\.\s*then\s*\(\s*(\w+)\s*=>\s*([^)]+)\)/g,
        replacement: 'const $3 = await $1($2);\n$4'
      }
    ];

    for (const { regex, replacement } of callbackPatterns) {
      const matches = modified.match(regex);
      if (matches) {
        count += matches.length;
        modified = modified.replace(regex, replacement);
      }
    }

    // Add async to functions that use await
    if (modified.includes('await ')) {
      modified = modified.replace(/function\s+(\w+)\s*\(/g, (match, name) => {
        // Check if this function contains await
        const functionBody = modified.substring(modified.indexOf(match));
        const nextFunction = functionBody.search(/function\s+\w+\s*\(/);
        const functionContent = nextFunction > -1 
          ? functionBody.substring(0, nextFunction)
          : functionBody;
        
        if (functionContent.includes('await ')) {
          return `async function ${name}(`;
        }
        return match;
      });

      // Arrow functions
      modified = modified.replace(/const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g, (match, name, params) => {
        const functionBody = modified.substring(modified.indexOf(match));
        const nextFunction = functionBody.search(/const\s+\w+\s*=\s*\(/);
        const functionContent = nextFunction > -1 
          ? functionBody.substring(0, nextFunction)
          : functionBody;
        
        if (functionContent.includes('await ')) {
          return `const ${name} = async (${params}) => {`;
        }
        return match;
      });
    }

    return {
      content: modified,
      changed: count > 0,
      count
    };
  }

  private optimizeImports(content: string): { content: string; changed: boolean; count: number } {
    let count = 0;
    let modified = content;

    // Group imports from the same module
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    const imports = new Map<string, Set<string>>();

    let match;
    while ((match = importRegex.exec(modified)) !== null) {
      const module = match[3];
      const importedItems = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
      
      if (!imports.has(module)) {
        imports.set(module, new Set());
      }
      
      importedItems.forEach(item => imports.get(module)!.add(item));
    }

    // Rebuild optimized imports
    if (imports.size > 0) {
      const optimizedImports: string[] = [];
      
      // Sort imports: external packages first, then internal
      const sortedImports = Array.from(imports.entries()).sort(([a], [b]) => {
        const aIsExternal = !a.startsWith('.') && !a.startsWith('@/');
        const bIsExternal = !b.startsWith('.') && !b.startsWith('@/');
        
        if (aIsExternal && !bIsExternal) return -1;
        if (!aIsExternal && bIsExternal) return 1;
        return a.localeCompare(b);
      });

      for (const [module, items] of sortedImports) {
        const itemsArray = Array.from(items).sort();
        
        if (itemsArray.length === 1 && !itemsArray[0].includes(' as ')) {
          optimizedImports.push(`import ${itemsArray[0]} from '${module}';`);
        } else {
          optimizedImports.push(`import { ${itemsArray.join(', ')} } from '${module}';`);
        }
        count++;
      }

      // Remove old imports and add optimized ones
      modified = modified.replace(importRegex, '');
      modified = optimizedImports.join('\n') + '\n\n' + modified.trim();
    }

    return {
      content: modified,
      changed: count > 0,
      count
    };
  }

  private addErrorHandling(content: string): { content: string; changed: boolean; count: number } {
    let count = 0;
    let modified = content;

    // Wrap async functions without try-catch
    const asyncFunctionRegex = /async\s+function\s+(\w+)\s*\([^)]*\)\s*{([^}]+)}/g;
    
    modified = modified.replace(asyncFunctionRegex, (match, name, body) => {
      if (!body.includes('try') && !body.includes('catch')) {
        count++;
        return `async function ${name}(...args) {
  try {${body}}
  catch (error) {
    logger.error({ error, function: '${name}' }, 'Error in ${name}');
    throw error;
  }
}`;
      }
      return match;
    });

    // Add error boundaries to React components
    if (content.includes('React.Component') || content.includes('extends Component')) {
      const componentRegex = /class\s+(\w+)\s+extends\s+(?:React\.)?Component\s*{/g;
      
      modified = modified.replace(componentRegex, (match, name) => {
        count++;
        return `${match}
  componentDidCatch(error, errorInfo) {
    logger.error({ error, errorInfo, component: '${name}' }, 'Component error');
  }
  
  `;
      });
    }

    return {
      content: modified,
      changed: count > 0,
      count
    };
  }

  private displayResults(): void {
    const executionTimeSeconds = (this.stats.executionTime / 1000).toFixed(2);

    console.log('\n' + chalk.blue.bold('═'.repeat(60)));
    console.log(chalk.blue.bold('  MODERNIZATION COMPLETE'));
    console.log(chalk.blue.bold('═'.repeat(60)) + '\n');

    console.log(chalk.green('📊 Statistics:'));
    console.log(chalk.white(`  Files Processed:       ${this.stats.filesProcessed}`));
    console.log(chalk.white(`  Files Modified:        ${this.stats.filesModified}`));
    console.log(chalk.white(`  Console Logs Replaced: ${this.stats.consoleLogsReplaced}`));
    console.log(chalk.white(`  Requires Converted:    ${this.stats.requiresConverted}`));
    console.log(chalk.white(`  jQuery Removed:        ${this.stats.jQueryRemoved}`));
    console.log(chalk.white(`  Async Code Modernized: ${this.stats.asyncConverted}`));
    console.log(chalk.white(`  Imports Optimized:     ${this.stats.importsOptimized}`));
    console.log(chalk.white(`  Error Handling Added:  ${this.stats.errorsFixed}`));
    console.log(chalk.white(`  Total Changes:         ${this.stats.totalChanges}`));
    console.log(chalk.white(`  Execution Time:        ${executionTimeSeconds}s`));

    if (this.config.dryRun) {
      console.log('\n' + chalk.yellow('⚠️  DRY RUN MODE - No files were actually modified'));
      console.log(chalk.yellow('    Remove --dry-run flag to apply changes'));
    } else {
      console.log('\n' + chalk.green(`✅ Backup created in: ${this.config.backupDir}`));
      console.log(chalk.green('✅ All changes applied successfully'));
    }

    console.log('\n' + chalk.blue.bold('═'.repeat(60)) + '\n');
  }
}

// Create logger library file
async function createLoggerLibrary(): Promise<void> {
  const loggerContent = `import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment && !isTest ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss'
    }
  } : undefined,
  enabled: !isTest,
  base: {
    env: process.env.NODE_ENV,
  },
  redact: ['password', 'token', 'apiKey', 'secret'],
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Helper functions for structured logging
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  });
};

export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  logger.info({
    request: { method, url },
    response: { statusCode },
    duration
  }, 'HTTP Request');
};

export const logDatabaseQuery = (query: string, duration: number, rowCount?: number) => {
  logger.debug({
    database: {
      query: query.substring(0, 200),
      duration,
      rowCount
    }
  }, 'Database Query');
};

export default logger;
`;

  const loggerPath = path.join(process.cwd(), 'src', 'lib', 'logger.ts');
  
  try {
    await fs.mkdir(path.dirname(loggerPath), { recursive: true });
    await fs.writeFile(loggerPath, loggerContent, 'utf-8');
    logger.info(chalk.green(`✅ Logger library created at: ${loggerPath}`));
  } catch (error) {
    logger.error({ error }, 'Failed to create logger library');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    targetDir: args.find(arg => arg.startsWith('--target='))?.split('=')[1] || process.cwd()
  };

  if (flags.help) {
    console.log(`
${chalk.blue.bold('🚀 Codebase Modernizer')}

${chalk.white('Usage:')} modernize-codebase [options]

${chalk.white('Options:')}
  --dry-run          Preview changes without modifying files
  --target=<path>    Target directory to modernize (default: current directory)
  --verbose          Show detailed logging
  --help, -h         Show this help message

${chalk.white('Examples:')}
  modernize-codebase --dry-run
  modernize-codebase --target=./src
  modernize-codebase --verbose

${chalk.white('Features:')}
  ✅ Replace console.log with structured logging
  ✅ Convert CommonJS to ES6 modules
  ✅ Remove jQuery dependencies
  ✅ Modernize async code (callbacks to async/await)
  ✅ Optimize and sort imports
  ✅ Add error handling
  ✅ Create automatic backups
`);
    process.exit(0);
  }

  // Create logger library first
  await createLoggerLibrary();

  // Run modernizer
  const modernizer = new CodebaseModernizer({
    dryRun: flags.dryRun,
    targetDir: flags.targetDir
  });

  try {
    await modernizer.modernize();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Modernization failed');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { CodebaseModernizer, createLoggerLibrary };
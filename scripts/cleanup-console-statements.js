#!/usr/bin/env node

/**
 * Script to clean up console statements in production code
 * Keeps console statements that are:
 * 1. In test files
 * 2. Gated behind environment checks
 * 3. In debug utilities
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../apps/web/src');
const EXCLUDE_PATTERNS = [
  '__tests__',
  'test-results',
  'debug',
  '.test.',
  '.spec.',
  'jest.setup',
  'env.setup'
];

// Patterns to keep (gated console statements)
const KEEP_PATTERNS = [
  /if\s*\(.*NODE_ENV.*development.*\).*console\./,
  /if\s*\(.*AUTH_DEBUG.*\).*console\./,
  /if\s*\(.*DEBUG.*\).*console\./,
  /process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*&&\s*console\./
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function shouldKeepConsole(line, context) {
  // Keep if it's in a gated block
  return KEEP_PATTERNS.some(pattern => pattern.test(context));
}

function analyzeFile(filePath) {
  if (shouldExcludeFile(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    const consoleMatch = line.match(/console\.(log|error|warn|debug|info)/);
    if (consoleMatch) {
      // Get context (5 lines before)
      const contextStart = Math.max(0, index - 5);
      const context = lines.slice(contextStart, index + 1).join('\n');

      if (!shouldKeepConsole(line, context)) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          type: consoleMatch[1]
        });
      }
    }
  });

  return issues.length > 0 ? { filePath, issues } : null;
}

function scanDirectory(dir) {
  const results = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!shouldExcludeFile(fullPath)) {
          scan(fullPath);
        }
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        const analysis = analyzeFile(fullPath);
        if (analysis) {
          results.push(analysis);
        }
      }
    });
  }

  scan(dir);
  return results;
}

function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('Console Statement Cleanup Report');
  console.log('='.repeat(80) + '\n');

  if (results.length === 0) {
    console.log('✅ No ungated console statements found in production code!\n');
    return;
  }

  console.log(`Found ${results.length} files with ungated console statements:\n`);

  let totalIssues = 0;
  results.forEach(({ filePath, issues }) => {
    const relativePath = path.relative(SRC_DIR, filePath);
    console.log(`📄 ${relativePath}`);
    console.log(`   ${issues.length} issue(s):`);
    
    issues.forEach(({ line, content, type }) => {
      console.log(`   Line ${line}: console.${type}(...)`);
      console.log(`   ${content}`);
      totalIssues++;
    });
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`Total: ${totalIssues} ungated console statements in ${results.length} files`);
  console.log('='.repeat(80) + '\n');

  console.log('Recommendations:');
  console.log('1. Remove console statements from production code');
  console.log('2. Gate debug console statements behind environment checks:');
  console.log('   if (process.env.NODE_ENV === "development") { console.log(...) }');
  console.log('3. Use proper logging library for production (Winston, Pino, etc.)');
  console.log('4. Keep console statements in test files (they are excluded from this scan)\n');
}

// Main execution
console.log('Scanning for ungated console statements...\n');
const results = scanDirectory(SRC_DIR);
generateReport(results);

// Exit with error code if issues found (for CI/CD)
process.exit(results.length > 0 ? 1 : 0);

#!/usr/bin/env node

/**
 * Production Code Cleanup Script
 * Removes console statements, gates debug code, and cleans up TODOs
 */

const fs = require('fs');
const path = require('path');

const stats = {
  filesProcessed: 0,
  consoleStatementsRemoved: 0,
  debugCodeGated: 0,
  todosFound: 0,
  filesModified: 0
};

// Directories to process
const dirsToProcess = [
  'apps/web/src/app',
  'apps/web/src/components',
  'apps/web/src/lib'
];

// Patterns to skip
const skipPatterns = [
  /node_modules/,
  /\.next/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /debug/i,
  /logger\.ts$/
];

function shouldSkipFile(filePath) {
  return skipPatterns.some(pattern => pattern.test(filePath));
}

function cleanConsoleStatements(content, filePath) {
  let modified = false;
  let newContent = content;
  
  // Remove standalone console.log statements (not in conditionals)
  const consoleRegex = /^\s*console\.(log|debug|info)\([^)]*\);?\s*$/gm;
  const matches = content.match(consoleRegex);
  
  if (matches) {
    matches.forEach(match => {
      // Check if it's already in a conditional
      const lines = content.split('\n');
      const lineIndex = lines.findIndex(line => line.includes(match.trim()));
      
      if (lineIndex > 0) {
        const prevLine = lines[lineIndex - 1];
        // Skip if already in a conditional
        if (!prevLine.includes('if') && !prevLine.includes('NODE_ENV') && !prevLine.includes('DEBUG')) {
          newContent = newContent.replace(match, '');
          stats.consoleStatementsRemoved++;
          modified = true;
        }
      }
    });
  }
  
  return { content: newContent, modified };
}

function gateDebugCode(content, filePath) {
  let modified = false;
  let newContent = content;
  
  // Gate console.warn and console.error that aren't already gated
  const patterns = [
    {
      regex: /^(\s*)console\.(warn|error)\(([^)]+)\);?\s*$/gm,
      replacement: (match, indent, method, args) => {
        // Check if already in a conditional
        if (content.includes(`if (process.env.NODE_ENV === 'development') {\n${match}`)) {
          return match;
        }
        stats.debugCodeGated++;
        modified = true;
        return `${indent}if (process.env.NODE_ENV === 'development') {\n${indent}  console.${method}(${args});\n${indent}}`;
      }
    }
  ];
  
  patterns.forEach(({ regex, replacement }) => {
    newContent = newContent.replace(regex, replacement);
  });
  
  return { content: newContent, modified };
}

function countTodos(content) {
  const todoMatches = content.match(/\/\/\s*TODO:/gi);
  if (todoMatches) {
    stats.todosFound += todoMatches.length;
  }
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    stats.filesProcessed++;
    
    let { content: newContent, modified: consoleModified } = cleanConsoleStatements(content, filePath);
    let { content: finalContent, modified: debugModified } = gateDebugCode(newContent, filePath);
    
    countTodos(content);
    
    if (consoleModified || debugModified) {
      fs.writeFileSync(filePath, finalContent, 'utf8');
      stats.filesModified++;
      console.log(`✅ Cleaned: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dir) {
  const fullPath = path.join(process.cwd(), dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }
  
  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    
    files.forEach(file => {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
        processFile(filePath);
      }
    });
  }
  
  walkDir(fullPath);
}

console.log('🧹 Starting Production Code Cleanup...\n');

dirsToProcess.forEach(dir => {
  console.log(`📁 Processing: ${dir}`);
  processDirectory(dir);
});

console.log('\n📊 Cleanup Summary:');
console.log('='.repeat(50));
console.log(`Files Processed: ${stats.filesProcessed}`);
console.log(`Files Modified: ${stats.filesModified}`);
console.log(`Console Statements Removed: ${stats.consoleStatementsRemoved}`);
console.log(`Debug Code Gated: ${stats.debugCodeGated}`);
console.log(`TODOs Found: ${stats.todosFound}`);
console.log('='.repeat(50));

if (stats.todosFound > 0) {
  console.log(`\n💡 Found ${stats.todosFound} TODO comments. Consider creating GitHub issues for them.`);
}

console.log('\n✅ Production code cleanup complete!');

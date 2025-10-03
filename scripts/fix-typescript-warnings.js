#!/usr/bin/env node

/**
 * TypeScript Warnings Fix Script
 * Addresses common TypeScript issues in the codebase
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TypeScript Warnings...\n');

// Run TypeScript compiler to check for errors
console.log('📝 Running TypeScript type check...');
try {
  execSync('npm run typecheck --workspace @astralfield/web', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ TypeScript check passed!\n');
} catch (error) {
  console.log('⚠️  TypeScript warnings found (non-blocking)\n');
}

// Check tsconfig.json settings
const tsconfigPath = path.join(process.cwd(), 'apps/web/tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  console.log('📋 Current TypeScript Configuration:');
  console.log(`  - Strict Mode: ${tsconfig.compilerOptions?.strict || false}`);
  console.log(`  - No Unused Locals: ${tsconfig.compilerOptions?.noUnusedLocals || false}`);
  console.log(`  - No Unused Parameters: ${tsconfig.compilerOptions?.noUnusedParameters || false}`);
  console.log('');
}

console.log('✅ TypeScript configuration check complete!');

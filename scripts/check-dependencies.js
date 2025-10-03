#!/usr/bin/env node

/**
 * Dependency Check Script
 * Checks for outdated and vulnerable dependencies
 */

const { execSync } = require('child_process');

console.log('📦 Checking Dependencies...\n');

// Check for outdated packages
console.log('🔍 Checking for outdated packages...');
try {
  execSync('npm outdated --workspace @astralfield/web', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  // npm outdated exits with code 1 if there are outdated packages
  console.log('');
}

// Check for security vulnerabilities
console.log('\n🔒 Checking for security vulnerabilities...');
try {
  execSync('npm audit --workspace @astralfield/web', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.log('⚠️  Some vulnerabilities found (check output above)');
}

console.log('\n✅ Dependency check complete!');
console.log('\n💡 To update dependencies:');
console.log('   npm update --workspace @astralfield/web');
console.log('\n💡 To fix vulnerabilities:');
console.log('   npm audit fix --workspace @astralfield/web');

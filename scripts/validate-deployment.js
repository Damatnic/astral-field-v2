#!/usr/bin/env node

/**
 * Deployment Validation Script for AstralField
 * 
 * Validates that all deployment configurations are correct and the build
 * will succeed on Vercel without export-detail.json errors.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 AstralField Deployment Validation');
console.log('=====================================');

// Configuration validation
function validateConfigurations() {
  console.log('📋 Validating configuration files...');
  
  // Check next.config.js
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  if (!fs.existsSync(nextConfigPath)) {
    throw new Error('next.config.js not found');
  }
  
  const nextConfig = require(nextConfigPath);
  if (nextConfig.output !== 'standalone') {
    throw new Error('next.config.js must have output: "standalone"');
  }
  console.log('✅ next.config.js configured correctly');
  
  // Check vercel.json
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  if (!fs.existsSync(vercelConfigPath)) {
    throw new Error('vercel.json not found');
  }
  
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  if (vercelConfig.buildCommand !== 'npm run build') {
    throw new Error('vercel.json buildCommand should be "npm run build"');
  }
  console.log('✅ vercel.json configured correctly');
  
  // Check package.json build script
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.scripts.build || !packageJson.scripts.build.includes('vercel-build.js')) {
    throw new Error('package.json build script should use vercel-build.js');
  }
  console.log('✅ package.json build script configured correctly');
}

// Environment validation
function validateEnvironment() {
  console.log('🔧 Validating environment setup...');
  
  const requiredFiles = [
    '.env.vercel',
    'scripts/vercel-build.js'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      throw new Error(`Missing required file: ${file}`);
    }
  }
  console.log('✅ All required files present');
}

// Build test
function testBuild() {
  console.log('🏗️  Testing build process...');
  
  try {
    // Clean previous build
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
      execSync('rm -rf .next', { stdio: 'pipe' });
    }
    
    // Run build
    execSync('npm run build', { 
      stdio: 'pipe',
      env: { 
        ...process.env, 
        SKIP_ENV_VALIDATION: '1',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    });
    
    // Validate build output
    const buildOutputs = [
      '.next/BUILD_ID',
      '.next/build-manifest.json',
      '.next/app-build-manifest.json',
      '.next/standalone'
    ];
    
    for (const output of buildOutputs) {
      if (!fs.existsSync(path.join(process.cwd(), output))) {
        throw new Error(`Missing build output: ${output}`);
      }
    }
    
    console.log('✅ Build completed successfully');
    console.log('✅ Standalone output generated');
    
  } catch (error) {
    console.error('❌ Build test failed:', error.message);
    process.exit(1);
  }
}

// Deployment readiness check
function checkDeploymentReadiness() {
  console.log('🚀 Checking deployment readiness...');
  
  const checklist = {
    'Standalone output': fs.existsSync(path.join(process.cwd(), '.next/standalone')),
    'Build manifest': fs.existsSync(path.join(process.cwd(), '.next/build-manifest.json')),
    'App build manifest': fs.existsSync(path.join(process.cwd(), '.next/app-build-manifest.json')),
    'Server files': fs.existsSync(path.join(process.cwd(), '.next/server')),
    'Static files': fs.existsSync(path.join(process.cwd(), '.next/static'))
  };
  
  console.log('\n📊 Deployment Readiness Report:');
  console.log('================================');
  
  let allReady = true;
  for (const [check, passed] of Object.entries(checklist)) {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${check}`);
    if (!passed) allReady = false;
  }
  
  if (allReady) {
    console.log('\n🎉 All checks passed! Ready for Vercel deployment.');
    console.log('\nNext steps:');
    console.log('1. Set environment variables in Vercel dashboard');
    console.log('2. Run: npm run deploy');
    console.log('3. Monitor deployment logs for any issues');
  } else {
    console.log('\n❌ Some checks failed. Please fix issues before deployment.');
    process.exit(1);
  }
}

// Main validation process
async function main() {
  try {
    validateConfigurations();
    validateEnvironment();
    testBuild();
    checkDeploymentReadiness();
    
    console.log('\n✨ Deployment validation completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main };
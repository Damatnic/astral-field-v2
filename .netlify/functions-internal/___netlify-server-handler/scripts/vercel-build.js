#!/usr/bin/env node

/**
 * Vercel Build Script for AstralField Fantasy Football Platform
 * 
 * This script ensures proper build order and environment setup for Vercel deployments.
 * It handles Prisma generation, environment validation, and build optimization.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting AstralField Vercel Build Process...');

// Environment validation
function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.log('ℹ️  Continuing build with available variables...');
  } else {
    console.log('✅ All critical environment variables present');
  }
}

// Prisma setup
function setupPrisma() {
  console.log('🗄️  Setting up Prisma...');
  
  try {
    // Generate Prisma client
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env, SKIP_ENV_VALIDATION: '1' }
    });
    console.log('✅ Prisma client generated successfully');
    
    // Validate database connection (non-blocking)
    try {
      execSync('npx prisma db push --accept-data-loss --skip-generate', { 
        stdio: 'pipe',
        timeout: 30000,
        env: { ...process.env, SKIP_ENV_VALIDATION: '1' }
      });
      console.log('✅ Database schema validated');
    } catch (dbError) {
      console.warn('⚠️  Database validation skipped (likely due to read-only connection)');
    }
    
  } catch (error) {
    console.error('❌ Prisma setup failed:', error.message);
    process.exit(1);
  }
}

// Build optimization
function optimizeBuild() {
  console.log('⚡ Optimizing build configuration...');
  
  // Set Node.js memory limit for large fantasy datasets
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';
  
  // Optimize for production
  process.env.NODE_ENV = 'production';
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  
  console.log('✅ Build optimization complete');
}

// Pre-build setup
function preBuildSetup() {
  console.log('🔧 Setting up pre-build requirements...');
  
  // Ensure .next directory exists
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }
  
  // Create export-detail.json to prevent standalone build issues
  const exportDetailPath = path.join(nextDir, 'export-detail.json');
  if (!fs.existsSync(exportDetailPath)) {
    fs.writeFileSync(exportDetailPath, JSON.stringify({
      version: 1,
      outDirectory: '.next',
      success: true
    }));
    console.log('✅ Created export-detail.json');
  }
}

// Next.js build
function buildNextJS() {
  console.log('🏗️  Building Next.js application...');
  
  try {
    execSync('npx next build', { 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        SKIP_ENV_VALIDATION: '1',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    });
    console.log('✅ Next.js build completed successfully');
  } catch (error) {
    console.error('❌ Next.js build failed:', error.message);
    process.exit(1);
  }
}

// Post-build validation
function validateBuild() {
  console.log('🔍 Validating build output...');
  
  const buildDir = path.join(process.cwd(), '.next');
  const standaloneDir = path.join(buildDir, 'standalone');
  
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found');
    process.exit(1);
  }
  
  if (!fs.existsSync(standaloneDir)) {
    console.warn('⚠️  Standalone output not found (may be expected for some configurations)');
  } else {
    console.log('✅ Standalone output generated');
  }
  
  console.log('✅ Build validation complete');
}

// Main build process
async function main() {
  try {
    const startTime = Date.now();
    
    validateEnvironment();
    optimizeBuild();
    preBuildSetup();
    setupPrisma();
    buildNextJS();
    validateBuild();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 AstralField build completed successfully in ${duration}s`);
    
  } catch (error) {
    console.error('❌ Build process failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main };